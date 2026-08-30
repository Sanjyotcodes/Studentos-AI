// Centralized Express error-handling middleware.
// The ONLY place in the codebase allowed to format an error response.
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger';

// multer's own MulterError (e.g. LIMIT_FILE_SIZE from upload.middleware.ts)
// carries no `status`/`statusCode` property at all — unlike body-parser's
// errors below, it would otherwise fall all the way through to the generic
// 500 branch. Mapped explicitly so an oversized upload comes back as 413,
// not a false "something went wrong."
function mapMulterError(err: multer.MulterError): { status: number; code: string; message: string } {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Uploaded file is too large.' };
  }
  return { status: 400, code: 'BAD_REQUEST', message: 'The uploaded file could not be processed.' };
}

// Some middleware (notably body-parser, for a too-large or malformed body)
// throws a plain Error carrying an HTTP status via `status`/`statusCode`
// rather than one of our AppError subclasses. Honoring that status (T15.8:
// an oversized body must come back as 413, not a generic 500) still never
// forwards the library's own message — only our own generic, per-status text
// reaches the client (T15.6).
function getHttpStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const status = (err as { status?: unknown }).status ?? (err as { statusCode?: unknown }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return status;
    }
  }
  return undefined;
}

function genericClientErrorBody(status: number): { code: string; message: string } {
  switch (status) {
    case 400:
      return { code: 'BAD_REQUEST', message: 'The request could not be understood.' };
    case 413:
      return { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' };
    default:
      return { code: 'CLIENT_ERROR', message: 'The request could not be processed.' };
  }
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // Express identifies error middleware by arity — this parameter must stay even though unused.
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Request failed', { requestId: req.requestId, code: err.code, statusCode: err.statusCode });
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const mapped = mapMulterError(err);
    logger.warn('Upload error', { requestId: req.requestId, code: mapped.code, multerCode: err.code });
    res
      .status(mapped.status)
      .json({ success: false, error: { code: mapped.code, message: mapped.message } });
    return;
  }

  const httpStatus = getHttpStatus(err);
  if (httpStatus !== undefined) {
    logger.warn('Client error', { requestId: req.requestId, statusCode: httpStatus });
    res.status(httpStatus).json({ success: false, error: genericClientErrorBody(httpStatus) });
    return;
  }

  // Unknown/unexpected error — logged with only its message (never a raw
  // stack, SQL text, or file path in the *response*; the message itself is
  // logged server-side only, through the redacting logger, for operators to
  // investigate).
  logger.error('Unhandled error', {
    requestId: req.requestId,
    message: err instanceof Error ? err.message : String(err),
  });

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
  });
}
