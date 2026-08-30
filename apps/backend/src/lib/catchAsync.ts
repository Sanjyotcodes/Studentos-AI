// Wraps an async Express handler so a rejected promise reaches error.middleware
// instead of becoming an unhandled rejection — Express 4 does not do this itself.
import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function catchAsync(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
