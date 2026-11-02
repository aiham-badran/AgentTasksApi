# AgentTasks API

> Task backend built for humans, ready for AI agents.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](...)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green)](...)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](...)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-orange)](...)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-brightgreen)](...)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](...)

A REST API for task management, designed from day one to be **friendly to AI agents** — not just humans.

## 🔗 Live Demo & Docs

| Resource               | Link                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Live API**           | _Coming in M7_ (Render)                                                                              |
| **Swagger UI**         | `/docs` (once deployed)                                                                              |
| **Postman Collection** | [`docs/postman/AgentTasks.postman_collection.json`](docs/postman/AgentTasks.postman_collection.json) |

## ✨ Why This Project?

Most task managers weren't designed for AI agents. AgentTasks fixes that:

- **Dual auth** — JWT for humans, API keys for agents.
- **BYOK (Bring Your Own Key)** — plug your own Groq / Google / OpenRouter key. Zero cost to the operator.
- **Natural language endpoint** — `POST /tasks/nl` turns "call Sara tomorrow 5pm" into a structured task.
- **LLM-friendly errors** — every error includes `hint`, `suggested_action`, and `retryable`.
- **Source tracking** — every task knows if it came from `manual`, `ai_nl`, or `webhook`.

## 🏗️ Architecture

```test
Client → Express Router → Rate Limit → Auth (JWT) → Validation (Zod)
       → Controller → Service → Drizzle ORM → SQLite

(NL flow): Service → Provider Adapter → LLM API → Zod validate → Save
```

**Stack:** Node.js 20 · TypeScript · Express 4 · Drizzle ORM · SQLite (PostgreSQL-ready) · Zod · JWT · Swagger · Vitest.

## 🔐 Security Highlights

- Passwords hashed with **bcrypt** (cost 12).
- API keys encrypted with **AES-256-GCM** before storage — never returned in full.
- **Ownership isolation** on every task query (`WHERE user_id = ?`).
- **Rate limiting** on auth endpoints (10 req/min) and globally (100 req/15min).
- **Structured, non-leaky errors** — login failure never reveals whether the email exists.
- Secrets redacted from logs (Pino `redact`).

## 🚀 Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Generate a master key:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Paste into MASTER_ENCRYPTION_KEY in .env

# 3. Migrate & seed
mkdir -p data
npm run db:migrate
npm run db:seed

# 4. Run
npm run dev
```

API at `http://localhost:3000` · Docs at `http://localhost:3000/docs`.

## 📚 API Reference (summary)

| Method | Endpoint                                      | Auth | Description              |
| ------ | --------------------------------------------- | ---- | ------------------------ |
| POST   | `/api/v1/auth/register`                       | —    | Register                 |
| POST   | `/api/v1/auth/login`                          | —    | Login → JWT              |
| GET    | `/api/v1/auth/me`                             | JWT  | Current user             |
| POST   | `/api/v1/settings/ai-keys`                    | JWT  | Add/update BYOK key      |
| GET    | `/api/v1/settings/ai-keys`                    | JWT  | List masked keys         |
| DELETE | `/api/v1/settings/ai-keys/:provider`          | JWT  | Delete key               |
| POST   | `/api/v1/settings/ai-keys/:provider/validate` | JWT  | Re-validate              |
| GET    | `/api/v1/settings/ai-keys/:provider/models`   | JWT  | List models              |
| POST   | `/api/v1/tasks`                               | JWT  | Create task              |
| GET    | `/api/v1/tasks`                               | JWT  | List (filter + paginate) |
| GET    | `/api/v1/tasks/:id`                           | JWT  | Get one                  |
| PATCH  | `/api/v1/tasks/:id`                           | JWT  | Update                   |
| DELETE | `/api/v1/tasks/:id`                           | JWT  | Soft delete              |
| POST   | `/api/v1/tasks/:id/complete`                  | JWT  | Complete                 |
| POST   | `/api/v1/tasks/:id/reopen`                    | JWT  | Reopen                   |
| POST   | `/api/v1/tasks/nl`                            | JWT  | **Create from NL**       |

Full interactive reference: **`/docs`** (Swagger UI).

### Example: create a task from natural language

```bash
curl -X POST http://localhost:3000/api/v1/tasks/nl \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"remind me to call Sara tomorrow at 5pm urgently"}'
```

```json
{
  "id": "...",
  "title": "Call Sara",
  "priority": "urgent",
  "dueDate": "2026-11-03T17:00:00.000Z",
  "source": "ai_nl",
  "metadata": {
    "provider": "groq",
    "model": "openai/gpt-oss-120b",
    "confidence": 0.95,
    "raw_text": "remind me to call Sara tomorrow at 5pm urgently"
  }
}
```

### Error shape (LLM-friendly)

```json
{
  "error": {
    "code": "AI_KEY_INVALID",
    "message": "Your Groq API key is invalid or has been revoked.",
    "hint": "Update your key at POST /api/v1/settings/ai-keys",
    "suggested_action": "reauth_provider",
    "request_id": "req_abc123",
    "retryable": false
  }
}
```

## 🧪 Testing

```bash
npm test                # run all tests
npm run test:coverage   # with coverage report
```

- **~150 tests** (unit + integration).
- Coverage target: **70%+** (encryption & auth are 90%+).
- In-memory SQLite per test file (isolated, fast).

## 🗺️ Roadmap

- [ ] **M7** — Deploy to Render (live URL)
- [ ] **M8** — Webhooks (`task.created`, `task.overdue`)
- [ ] **M9** — Idempotency keys for agent retries
- [ ] **M10** — **MCP Server** (use this API as a tool in Claude Desktop)
- [ ] **M11** — Audit log + per-agent quotas

## 📄 License

MIT
