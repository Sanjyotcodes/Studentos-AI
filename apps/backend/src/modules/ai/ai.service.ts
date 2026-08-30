// The ONLY place in the backend allowed to call the Gemini API directly
// (PLAN.md §4, invariant 4 — enforced by ai.static.test.ts's T10.1).
import { ApiError, GoogleGenAI, type PartUnion } from '@google/genai';
import type { AttendanceSummary } from '@studentos/shared';
import { DAYS_OF_WEEK } from '@studentos/shared';
import { env } from '../../config/env';
import { BadGatewayError, GatewayTimeoutError, ServiceUnavailableError } from '../../errors/AppError';
import { logger } from '../../lib/logger';
import { QUERY_SYSTEM_PROMPT } from './prompts/query.prompt';
import { STUDY_PLAN_SYSTEM_PROMPT } from './prompts/study-plan.prompt';
import { SUMMARIZE_NOTE_SYSTEM_PROMPT } from './prompts/summarize-note.prompt';
import { SUMMARY_SYSTEM_PROMPT } from './prompts/summary.prompt';
import { TIMETABLE_PARSE_SYSTEM_PROMPT } from './prompts/timetable-parse.prompt';

// 'gemini-2.5-flash' was a fixed dated snapshot that Google retired for new
// API accounts (a 404 from generateContent, even though models.list() still
// advertises it as capability-supported — the account-level restriction
// isn't reflected in that listing). 'gemini-flash-latest' replaced it as a
// Google-maintained alias, but it currently resolves to 'gemini-3.7-flash',
// whose free tier caps out at just 20 requests/day/project — verified via a
// direct models.list() call after repeatedly hitting RESOURCE_EXHAUSTED
// (429) mid-session. 'gemini-flash-lite-latest' is the equivalent
// Google-maintained alias for their Lite tier, which carries a much more
// generous free-tier daily quota (confirmed working with a live test call
// after the flash-tier quota was exhausted) — still auto-updates as models
// rotate, same as before, just pointed at the tier that doesn't run out
// after a normal day of development.
const MODEL = 'gemini-flash-lite-latest';
// Per-request token ceiling (PLAN.md §3.4) — bounds cost regardless of how
// long the student's question or the model's answer would otherwise run.
const MAX_TOKENS = 1024;
// A full multi-day schedule is much longer than a two-sentence answer or
// summary — the planner gets its own, higher ceiling rather than raising the
// default for every other call too.
const PLANNER_MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 20_000;

const REFUSAL_MESSAGE =
  "I'm not able to help with that request. Try asking about your attendance numbers instead.";
const EMPTY_RESPONSE_MESSAGE = "I couldn't generate a response just now. Please try again.";
const EMPTY_NOTE_MESSAGE = 'This note is empty — add some content before summarizing.';

// finishReason values that mean the model declined or was blocked from
// answering, as opposed to a normal stop ('STOP') or hitting the token
// ceiling ('MAX_TOKENS', which still carries whatever partial text exists).
const REFUSAL_FINISH_REASONS = new Set([
  'SAFETY',
  'PROHIBITED_CONTENT',
  'RECITATION',
  'BLOCKLIST',
  'SPII',
  'LANGUAGE',
  'OTHER',
]);

// Constructed lazily (not at module load) so importing this file never
// throws just because GEMINI_API_KEY is missing in an unrelated test — only
// routes that actually call the AI need a working client.
let client: GoogleGenAI | undefined;
function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export interface AiTextResult {
  text: string;
  refused: boolean;
}

// Renders numbers already computed by attendance.service.ts as structured
// context for the model — no arithmetic happens here (PLAN.md §4, invariant
// 10; T10.10 checks these numbers match attendance.service.ts exactly).
function buildAttendanceContext(summary: AttendanceSummary): string {
  return JSON.stringify(
    {
      overall: summary.overall,
      subjects: summary.subjects.map((s) => ({
        name: s.subjectName,
        code: s.subjectCode,
        attended: s.attended,
        total: s.total,
        percentage: s.percentage,
        cutoffPercent: s.minAttendancePercent,
        status: s.status,
        canMiss: s.canMiss,
        mustAttend: s.mustAttend,
      })),
    },
    null,
    2,
  );
}

// Translates Gemini SDK failures into our own error envelope — an upstream
// 500/timeout/overload must never surface as our own raw 500 stack (T10.6,
// T10.8). @google/genai has a single ApiError (HTTP status + message) for
// server-side failures; a client-side abort (our own timeout, below) throws
// a plain Error named "AbortError" instead, since it never got a response.
function mapGeminiError(err: unknown): Error {
  // Diagnostic only — never reaches the client (the messages/codes below are
  // all that's ever returned). logger.ts redacts GEMINI_API_KEY/JWT secret
  // values wherever they appear, so logging the raw message here is safe,
  // and it's the only way to actually see *why* Gemini rejected a call
  // instead of just the generic category.
  logger.error('Gemini call failed', {
    errorName: err instanceof Error ? err.name : typeof err,
    errorMessage: err instanceof Error ? err.message : String(err),
    isApiError: err instanceof ApiError,
    apiStatus: err instanceof ApiError ? err.status : undefined,
  });

  if (err instanceof Error && err.name === 'AbortError') {
    return new GatewayTimeoutError(
      'The AI assistant took too long to respond. Please try again.',
      'AI_TIMEOUT',
    );
  }
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return new ServiceUnavailableError(
        'The AI assistant is receiving too many requests right now. Please try again shortly.',
        'AI_RATE_LIMITED',
      );
    }
    return new BadGatewayError(
      'The AI assistant is temporarily unavailable. Please try again.',
      'AI_PROVIDER_ERROR',
    );
  }
  return new BadGatewayError(
    'The AI assistant is temporarily unavailable. Please try again.',
    'AI_PROVIDER_ERROR',
  );
}

interface AskOptions {
  maxOutputTokens?: number;
  // Set only by generateStudyPlan — asks Gemini to constrain its own output
  // to valid JSON matching the given schema. This narrows the malformed-
  // response surface but doesn't replace validation: planner.service.ts still
  // runs the parsed result through studyPlanAiResponseSchema before trusting
  // it (T13.4), since a schema hint is not an enforcement guarantee.
  responseFormat?: { mimeType: string; jsonSchema: unknown };
}

// PartUnion[] is what lets a call mix an inline image/PDF (parseTimetableImage,
// below — the AI layer's first non-text-only input) with a text instruction
// in the same turn; every other caller still just passes a plain string.
async function ask(
  systemPrompt: string,
  userContent: string | PartUnion[],
  options?: AskOptions,
): Promise<AiTextResult> {
  // The SDK has no built-in request timeout, so we enforce our own via
  // AbortController rather than leaving a request to hang indefinitely.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await getClient().models.generateContent({
      model: MODEL,
      // userContent (a string, or an image/PDF part plus an instruction
      // part) is never string-concatenated with the system instruction —
      // this is what keeps a prompt-injection attempt in the student's own
      // text from ever reaching or altering the instructions below (T10.11).
      // `systemInstruction` is fixed, versioned text; `contents` is data.
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: options?.maxOutputTokens ?? MAX_TOKENS,
        abortSignal: controller.signal,
        ...(options?.responseFormat
          ? {
              responseMimeType: options.responseFormat.mimeType,
              responseJsonSchema: options.responseFormat.jsonSchema,
            }
          : {}),
      },
    });
  } catch (err) {
    throw mapGeminiError(err);
  } finally {
    clearTimeout(timer);
  }

  // Always check for a block/refusal before reading text — a refused
  // response can arrive with no candidates and no text at all (T10.7).
  const blockReason = response.promptFeedback?.blockReason;
  const finishReason = response.candidates?.[0]?.finishReason;
  const refused = Boolean(blockReason) || (Boolean(finishReason) && REFUSAL_FINISH_REASONS.has(finishReason!));
  if (refused) {
    return { text: REFUSAL_MESSAGE, refused: true };
  }

  const text = response.text;
  return { text: text && text.length > 0 ? text : EMPTY_RESPONSE_MESSAGE, refused: false };
}

export async function answerQuery(question: string, summary: AttendanceSummary): Promise<AiTextResult> {
  const context = buildAttendanceContext(summary);
  const userContent = `Attendance data (JSON):\n${context}\n\nStudent question: ${question}`;
  return ask(QUERY_SYSTEM_PROMPT, userContent);
}

export async function generateSummary(summary: AttendanceSummary): Promise<AiTextResult> {
  const context = buildAttendanceContext(summary);
  return ask(SUMMARY_SYSTEM_PROMPT, `Attendance data (JSON):\n${context}`);
}

export async function summarizeNote(noteText: string): Promise<AiTextResult> {
  // T12.5: an empty note is handled without ever calling the Gemini API —
  // there's nothing to summarize, so skip the round trip and the token spend.
  if (noteText.trim().length === 0) {
    return { text: EMPTY_NOTE_MESSAGE, refused: false };
  }
  return ask(SUMMARIZE_NOTE_SYSTEM_PROMPT, `Note content:\n${noteText}`);
}

// JSON Schema (not a Gemini Schema object — see @google/genai's
// GenerateContentConfig.responseJsonSchema) describing the shape the model
// must respond in. `subjectId` is constrained to exactly the subject ids
// this request is about, so the model can't invent one (defense in depth —
// planner.service.ts double-checks this after parsing, since a schema hint
// narrows but doesn't guarantee compliance).
function buildStudyPlanResponseSchema(allowedSubjectIds: string[]) {
  return {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'YYYY-MM-DD' },
            subjectId: { type: 'string', enum: allowedSubjectIds },
            subjectName: { type: 'string' },
            activity: { type: 'string' },
          },
          required: ['date', 'subjectId', 'subjectName', 'activity'],
        },
      },
    },
    required: ['entries'],
  };
}

export async function generateStudyPlan(
  context: string,
  allowedSubjectIds: string[],
): Promise<AiTextResult> {
  return ask(STUDY_PLAN_SYSTEM_PROMPT, context, {
    maxOutputTokens: PLANNER_MAX_TOKENS,
    responseFormat: {
      mimeType: 'application/json',
      jsonSchema: buildStudyPlanResponseSchema(allowedSubjectIds),
    },
  });
}

// A busy weekly timetable can have 30+ slots — give it the same headroom as
// the study planner rather than the short default answer/summary ceiling.
const TIMETABLE_MAX_TOKENS = 4096;

function buildTimetableResponseSchema() {
  return {
    type: 'object',
    properties: {
      slots: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            subjectName: { type: 'string' },
            dayOfWeek: { type: 'string', enum: [...DAYS_OF_WEEK] },
            startTime: { type: 'string', description: 'HH:mm, 24-hour' },
            endTime: { type: 'string', description: 'HH:mm, 24-hour' },
          },
          required: ['subjectName', 'dayOfWeek', 'startTime', 'endTime'],
        },
      },
    },
    required: ['slots'],
  };
}

// Phase 16 — the AI layer's first non-text-only input: an uploaded timetable
// image/PDF, sent as inline base64 data alongside a text instruction. The
// caller (timetable.service.ts) always re-validates the parsed JSON against
// timetableAiResponseSchema and never persists it directly (T16.4) — a
// schema hint here narrows but doesn't guarantee the model's compliance,
// same discipline as generateStudyPlan.
export async function parseTimetableImage(imageBase64: string, mimeType: string): Promise<AiTextResult> {
  const parts: PartUnion[] = [
    { inlineData: { data: imageBase64, mimeType } },
    'Extract the weekly class timetable from this image/document, per the schema.',
  ];
  return ask(TIMETABLE_PARSE_SYSTEM_PROMPT, parts, {
    maxOutputTokens: TIMETABLE_MAX_TOKENS,
    responseFormat: {
      mimeType: 'application/json',
      jsonSchema: buildTimetableResponseSchema(),
    },
  });
}
