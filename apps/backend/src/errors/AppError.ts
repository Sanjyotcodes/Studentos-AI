// Custom error classes consumed by the centralized error middleware.
//
// `code` is a stable, machine-readable identifier the frontend can switch on
// (e.g. "EMAIL_IN_USE") — it is intentionally a plain string, not a closed
// union, because each feature module will introduce its own specific codes.
// The generic category name (e.g. "CONFLICT") is only the default when a
// call site doesn't need anything more specific.

export type AppErrorCode = string;

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(statusCode: number, code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown, code: AppErrorCode = 'BAD_REQUEST') {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code: AppErrorCode = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code: AppErrorCode = 'FORBIDDEN') {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', code: AppErrorCode = 'NOT_FOUND') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown, code: AppErrorCode = 'CONFLICT') {
    super(409, code, message, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message = 'Too many requests. Please try again later.',
    code: AppErrorCode = 'RATE_LIMITED',
  ) {
    super(429, code, message);
  }
}

// The next three exist for ai.service.ts to translate Gemini API failures
// into our own envelope — an upstream 500/timeout/overload must never surface
// as our own raw 500 stack (PLAN.md §3.4, T10.6/T10.8).
export class BadGatewayError extends AppError {
  constructor(message = 'Upstream service error', code: AppErrorCode = 'BAD_GATEWAY') {
    super(502, code, message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', code: AppErrorCode = 'SERVICE_UNAVAILABLE') {
    super(503, code, message);
  }
}

export class GatewayTimeoutError extends AppError {
  constructor(message = 'Upstream request timed out', code: AppErrorCode = 'GATEWAY_TIMEOUT') {
    super(504, code, message);
  }
}