import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/** Parses req.body with the schema (throws ZodError -> 400) and replaces it with the parsed value. */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
