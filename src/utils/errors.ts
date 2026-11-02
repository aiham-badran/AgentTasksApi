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

export class AuthEmailExistsError extends AppError {
  constructor() {
    super({
      code: 'AUTH_EMAIL_EXISTS',
      message: 'An account with this email already exists.',
      statusCode: 409,
      hint: 'Try logging in or use a different email.',
      suggestedAction: 'login',
    });
  }
}

export class TaskNotFoundError extends AppError {
  constructor() {
    super({
      code: 'TASK_NOT_FOUND',
      message: 'Task not found.',
      statusCode: 404,
      hint: 'Check the task ID or list your tasks at GET /api/v1/tasks',
      retryable: false,
    });
  }
}

export class AiKeyMissingError extends AppError {
  constructor() {
    super({
      code: 'AI_KEY_MISSING',
      message: 'No AI provider key configured.',
      statusCode: 428,
      hint: 'Add a key at POST /api/v1/settings/ai-keys',
      suggestedAction: 'add_ai_key',
    });
  }
}

export class AiKeyInvalidError extends AppError {
  constructor(provider?: string) {
    super({
      code: 'AI_KEY_INVALID',
      message: provider
        ? `Your ${provider} API key is invalid or has been revoked.`
        : 'Your AI provider key is invalid or has been revoked.',
      statusCode: 401,
      hint: 'Update your key at POST /api/v1/settings/ai-keys',
      suggestedAction: 'reauth_provider',
    });
  }
}

export class AiQuotaExceededError extends AppError {
  constructor(provider?: string) {
    super({
      code: 'AI_QUOTA_EXCEEDED',
      message: provider
        ? `Your ${provider} quota has been exhausted.`
        : 'Your AI provider quota has been exhausted.',
      statusCode: 429,
      hint: 'Wait for the quota to reset or use a different provider.',
      suggestedAction: 'switch_provider',
      retryable: true,
    });
  }
}

export class AiProviderError extends AppError {
  constructor(message = 'The AI provider returned an unexpected error.') {
    super({
      code: 'AI_PROVIDER_ERROR',
      message,
      statusCode: 502,
      hint: 'This is usually temporary. Retry in a few seconds.',
      retryable: true,
    });
  }
}

export class AiKeyNotFoundError extends AppError {
  constructor() {
    super({
      code: 'AI_KEY_NOT_FOUND',
      message: 'No key is configured for this provider.',
      statusCode: 404,
      hint: 'Add a key at POST /api/v1/settings/ai-keys',
      suggestedAction: 'add_ai_key',
    });
  }
}
