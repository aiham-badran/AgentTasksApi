export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly hint?: string;
  public readonly suggestedAction?: string;
  public readonly retryable: boolean;

  constructor(options: {
    code: string;
    message: string;
    statusCode: number;
    hint?: string;
    suggestedAction?: string;
    retryable?: boolean;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.hint = options.hint;
    this.suggestedAction = options.suggestedAction;
    this.retryable = options.retryable ?? false;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', hint?: string) {
    super({
      code: 'VALIDATION_FAILED',
      message,
      statusCode: 422,
      hint,
    });
  }
}

export class AuthRequiredError extends AppError {
  constructor() {
    super({
      code: 'AUTH_REQUIRED',
      message: 'Authentication required.',
      statusCode: 401,
      hint: 'Provide a Bearer token in the Authorization header.',
      suggestedAction: 'login',
    });
  }
}

export class AuthInvalidError extends AppError {
  constructor() {
    super({
      code: 'AUTH_INVALID',
      message: 'Invalid or expired token.',
      statusCode: 401,
      hint: 'Login again at POST /api/v1/auth/login',
      suggestedAction: 'login',
    });
  }
}
