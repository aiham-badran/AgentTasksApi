// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgentTasks API',
      version: '1.0.0',
      description:
        'Task backend built for humans, ready for AI agents. ' +
        'Dual auth (JWT + API keys), BYOK for Groq/Google/OpenRouter, ' +
        'natural-language-to-task endpoint, and LLM-friendly structured errors.',
      contact: {
        name: 'Aiham Badran',
        url: 'https://github.com/aiham-badran/AgentTasksApi',
      },
      license: { name: 'MIT' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}`, description: 'Development' },
      // { url: 'https://agent-tasks-api.onrender.com', description: 'Production' }, // M7
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT returned by /auth/register or /auth/login.',
        },
      },
      schemas: {
        // ─── Auth ─────────────────────────────
        RegisterInput: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: {
              type: 'string',
              minLength: 8,
              example: 'Password123',
              description: 'Min 8 chars, 1 uppercase, 1 digit.',
            },
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Jane Doe' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ─── Tasks ────────────────────────────
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Call Sara' },
            description: { type: 'string', nullable: true },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            source: {
              type: 'string',
              enum: ['manual', 'ai_nl', 'webhook'],
            },
            metadata: { type: 'object', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateTaskInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 2000, nullable: true },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              default: 'medium',
            },
            due_date: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        UpdateTaskInput: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 2000, nullable: true },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            },
            due_date: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        TaskListResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
            pagination: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 45 },
            total_pages: { type: 'integer', example: 3 },
            has_next: { type: 'boolean' },
            has_prev: { type: 'boolean' },
          },
        },

        // ─── AI Keys ──────────────────────────
        AiKey: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            provider: {
              type: 'string',
              enum: ['groq', 'google', 'openrouter'],
            },
            masked_key: { type: 'string', example: 'gsk_...a1b2' },
            is_active: { type: 'boolean' },
            last_validated_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateAiKeyInput: {
          type: 'object',
          required: ['provider', 'api_key'],
          properties: {
            provider: {
              type: 'string',
              enum: ['groq', 'google', 'openrouter'],
            },
            api_key: { type: 'string', minLength: 8, maxLength: 500 },
          },
        },
        ModelInfo: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'openai/gpt-oss-120b' },
            name: { type: 'string' },
            provider: { type: 'string' },
            contextWindow: { type: 'integer', nullable: true },
          },
        },

        // ─── NL Tasks ─────────────────────────
        CreateNlTaskInput: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 1000 },
            provider: {
              type: 'string',
              enum: ['groq', 'google', 'openrouter'],
              description: 'Optional. Defaults to first available provider.',
            },
            model: { type: 'string', description: 'Optional. Defaults to provider default.' },
          },
        },

        // ─── Errors ───────────────────────────
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'AI_KEY_INVALID' },
                message: { type: 'string' },
                hint: { type: 'string' },
                suggested_action: { type: 'string' },
                details: { type: 'object' },
                request_id: { type: 'string' },
                retryable: { type: 'boolean' },
              },
            },
          },
        },
      },
      // ─── Common responses ──────────────────
      responses: {
        Unauthorized: {
          description: 'Missing or invalid JWT',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'AUTH_INVALID',
                  message: 'Invalid or expired token.',
                  hint: 'Login again at POST /api/v1/auth/login',
                  request_id: 'req_abc123',
                  retryable: false,
                },
              },
            },
          },
        },
        ValidationFailed: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'VALIDATION_FAILED',
                  message: 'Request validation failed.',
                  details: { title: ['String must contain at least 1 character(s)'] },
                  request_id: 'req_abc123',
                  retryable: false,
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Liveness and readiness' },
      { name: 'Auth', description: 'Register, login, and profile' },
      { name: 'Tasks', description: 'Task CRUD with filters and pagination' },
      { name: 'NL Tasks', description: 'Create tasks from natural language' },
      { name: 'AI Keys', description: 'BYOK management for LLM providers' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/routes/*.routes.ts'], // ← يقرأ تعليقات الـ routes
};

export const swaggerSpec = swaggerJsdoc(options);
