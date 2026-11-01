// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
    interface Locals {
      validatedQuery?: unknown;
    }
  }
}

export {};
