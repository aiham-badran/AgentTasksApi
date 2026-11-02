# **المخطط الكامل**

## 1. الـ Stack النهائي (مثبّت)

| الطبقة     | الاختيار                               | السبب                              |
| ---------- | -------------------------------------- | ---------------------------------- |
| Runtime    | **Node.js 20+ LTS**                    | استقرار ودعم طويل                  |
| Language   | **TypeScript 5+**                      | نوعية + صورة احترافية              |
| Framework  | **Express 4**                          | مألوف لك                           |
| ORM        | **Drizzle ORM**                        | TS-first + PostgreSQL-ready        |
| DB         | **SQLite (better-sqlite3)**            | سرعة MVP + انتقال سهل              |
| Auth       | **JWT (jsonwebtoken) + bcrypt**        | المعيار                            |
| Validation | **Zod**                                | type-safe + يندمج مع Drizzle       |
| Docs       | **swagger-jsdoc + swagger-ui-express** | OpenAPI 3                          |
| Testing    | **Vitest + Supertest**                 | أسرع من Jest                       |
| Logging    | **Pino**                               | structured logs (صديقة للـ Agents) |
| Security   | **helmet + cors + express-rate-limit** | أساسيات لا تتنازل عنها             |
| Deploy     | **Render** (Web Service + Free Tier)   | Live URL مجاني                     |

---

## 2. هيكل المجلدات (Feature-Based + Layered)

```text
agent-tasks-api/
├── src/
│   ├── config/
│   │   ├── env.ts                 # Zod validation لـ process.env
│   │   ├── database.ts            # Drizzle client
│   │   └── swagger.ts             # OpenAPI spec
│   ├── db/
│   │   ├── schema.ts              # users, api_keys, tasks
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT verify + attach req.user
│   │   ├── error.middleware.ts    # موحد + LLM-friendly
│   │   ├── validate.middleware.ts # Zod schema validation
│   │   ├── rateLimit.middleware.ts
│   │   └── logger.middleware.ts
│   ├── modules/                   # كل feature في مجلد
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.schemas.ts
│   │   ├── tasks/
│   │   │   ├── tasks.controller.ts
│   │   │   ├── tasks.service.ts
│   │   │   ├── tasks.routes.ts
│   │   │   └── tasks.schemas.ts
│   │   ├── ai-keys/
│   │   │   ├── ai-keys.controller.ts
│   │   │   ├── ai-keys.service.ts
│   │   │   ├── ai-keys.routes.ts
│   │   │   └── ai-keys.schemas.ts
│   │   └── nl-tasks/
│   │       ├── nl-tasks.controller.ts
│   │       ├── nl-tasks.service.ts
│   │       └── nl-tasks.routes.ts
│   ├── providers/                 # ⭐ Adapter Pattern
│   │   ├── types.ts               # LLMProvider interface
│   │   ├── index.ts               # getProvider(id)
│   │   ├── groq.provider.ts
│   │   ├── google.provider.ts
│   │   └── openrouter.provider.ts
│   ├── utils/
│   │   ├── encryption.ts          # AES-256-GCM
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── errors.ts              # AppError classes
│   │   ├── logger.ts
│   │   └── pagination.ts
│   ├── types/
│   │   └── express.d.ts           # augment Request.user
│   ├── app.ts                     # express app (testable)
│   └── server.ts                  # listen
├── tests/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── tasks.test.ts
│   │   └── ai-keys.test.ts
│   └── unit/
│       ├── encryption.test.ts
│       └── providers.test.ts
├── docs/
│   ├── postman-collection.json
│   └── openapi.yaml               # مُولّد
├── .env.example
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 3. مخطط قاعدة البيانات (Drizzle Schema)

```typescript
// src/db/schema.ts
users:
  id            uuid (PK)
  email         text (unique, indexed)
  password_hash text
  name          text
  created_at    timestamp
  updated_at    timestamp

api_keys:                          // BYOK
  id                 uuid (PK)
  user_id            uuid (FK → users, cascade)
  provider           text            // 'groq' | 'google' | 'openrouter'
  encrypted_key      text            // AES-256-GCM ciphertext
  iv                 text            // base64
  auth_tag           text            // base64
  key_prefix         text            // آخر 4 أحرف للعرض
  is_active          boolean (default true)
  last_validated_at  timestamp
  created_at         timestamp
  updated_at         timestamp
  UNIQUE(user_id, provider)          // مفتاح واحد لكل مزوّد

tasks:
  id            uuid (PK)
  user_id       uuid (FK → users, indexed)
  title         text
  description   text (nullable)
  status        text   // 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority      text   // 'low' | 'medium' | 'high' | 'urgent'
  due_date      timestamp (nullable)
  completed_at  timestamp (nullable)
  source        text   // 'manual' | 'ai_nl' | 'webhook'  ← تتبع الأصل
  metadata      json   (nullable)   // تفاصيل parsing (provider, model, raw)
  created_at    timestamp
  updated_at    timestamp
  deleted_at    timestamp (nullable)  // soft delete
```

> **لماذا `source` و`metadata`؟** لأنهما يثبتان أنك تبني **لـ AI** وليس task app عادي. أي عميل تقني سيلاحظ هذا.

---

## 4. قائمة الـ Endpoints الكاملة (v1 MVP)

### Health

| Method | Path             | Auth | Notes                 |
| ------ | ---------------- | ---- | --------------------- |
| GET    | `/health`        | ❌   | للـ uptime monitoring |
| GET    | `/api/v1/health` | ❌   | DB ping               |

### Auth

| Method | Path                    | Auth   | Body                                      |
| ------ | ----------------------- | ------ | ----------------------------------------- |
| POST   | `/api/v1/auth/register` | ❌     | `{ email, password, name }`               |
| POST   | `/api/v1/auth/login`    | ❌     | `{ email, password }` → `{ token, user }` |
| GET    | `/api/v1/auth/me`       | ✅ JWT | —                                         |

### AI Keys (BYOK)

| Method | Path                                          | Auth   | Notes                                               |
| ------ | --------------------------------------------- | ------ | --------------------------------------------------- |
| POST   | `/api/v1/settings/ai-keys`                    | ✅ JWT | `{ provider, api_key }` → validate → encrypt → save |
| GET    | `/api/v1/settings/ai-keys`                    | ✅ JWT | يرجع masked فقط                                     |
| DELETE | `/api/v1/settings/ai-keys/:provider`          | ✅ JWT | حذف المفتاح                                         |
| POST   | `/api/v1/settings/ai-keys/:provider/validate` | ✅ JWT | إعادة التحقق                                        |
| GET    | `/api/v1/settings/ai-keys/:provider/models`   | ✅ JWT | قائمة الموديلات المتاحة                             |

### Tasks

| Method | Path                         | Auth   | Notes              |
| ------ | ---------------------------- | ------ | ------------------ |
| POST   | `/api/v1/tasks`              | ✅ JWT | إنشاء يدوي         |
| GET    | `/api/v1/tasks`              | ✅ JWT | فلترة + pagination |
| GET    | `/api/v1/tasks/:id`          | ✅ JWT | ownership check    |
| PATCH  | `/api/v1/tasks/:id`          | ✅ JWT | جزئي               |
| DELETE | `/api/v1/tasks/:id`          | ✅ JWT | soft delete        |
| POST   | `/api/v1/tasks/:id/complete` | ✅ JWT | convenience        |
| POST   | `/api/v1/tasks/:id/reopen`   | ✅ JWT | convenience        |

**Query params لـ `GET /tasks`:**

```text
?status=completed|pending|in_progress|cancelled
&priority=high
&search=keyword
&due_before=2026-11-01
&page=1&limit=20
&sort=created_at:desc
```

### NL Tasks (⭐ النجم)

| Method | Path               | Auth   | Body                                                                 |
| ------ | ------------------ | ------ | -------------------------------------------------------------------- |
| POST   | `/api/v1/tasks/nl` | ✅ JWT | `{ text: "remind me to call Sara tomorrow 5pm", provider?: "groq" }` |

**الاستجابة:**

```json
{
  "task": {
    "id": "uuid",
    "title": "Call Sara",
    "due_date": "2026-11-01T17:00:00Z",
    "priority": "medium",
    "status": "pending",
    "source": "ai_nl",
    "metadata": { "provider": "groq", "model": "...", "confidence": 0.92 }
  }
}
```

---

## 5. الشكل الموحّد للأخطاء (LLM-Friendly) ⭐

هذه الميزة وحدها ترفعك فوق 95% من البورتفوليوات:

```json
{
  "error": {
    "code": "AI_KEY_INVALID",
    "message": "Your Groq API key is invalid or has been revoked.",
    "hint": "Update your key at POST /api/v1/settings/ai-keys",
    "suggested_action": "reauth_provider",
    "docs_url": "https://your-api.com/docs#ai-keys",
    "request_id": "req_abc123"
  }
}
```

**أكواد الأخطاء المقترحة:**

```text
AUTH_REQUIRED         401
AUTH_INVALID          401
AUTH_EMAIL_EXISTS     409
TASK_NOT_FOUND        404
TASK_FORBIDDEN        403
VALIDATION_FAILED     422   (Zod errors)
AI_KEY_MISSING        428   (لا يوجد مفتاح للمزود)
AI_KEY_INVALID        401   (المفتاح مرفوض)
AI_QUOTA_EXCEEDED     429   (حصة مستنفدة)
AI_PROVIDER_ERROR     502
RATE_LIMITED          429
INTERNAL_ERROR        500
```

---

## 6. ترتيب التنفيذ (Milestones بلا تواريخ)

### 🟢 M0 — Setup (3-5 ساعات)

- [x] `npm init` + TypeScript + tsconfig + ESLint + Prettier
- [x] تثبيت الحزم: express, drizzle, better-sqlite3, zod, jsonwebtoken, bcrypt, helmet, cors, pino, vitest, supertest, swagger-\*
- [x] `src/config/env.ts` بـ Zod
- [x] `src/app.ts` + `src/server.ts` + `/health`
- [x] `.env.example` + `.gitignore`
- [x] أول commit
- **بوابة:** `curl localhost:3000/health` → `{ "status": "ok" }`

### 🟢 M1 — Database + Schema (4-6 ساعات)

- [x] `src/db/schema.ts` (users, api_keys, tasks)
- [x] `drizzle.config.ts` + أول migration
- [x] `src/config/database.ts`
- [x] `seed.ts` لمستخدم تجريبي
- **بوابة:** `npm run db:migrate` ينجح

### 🟢 M2 — Auth (8-10 ساعات)

- [x] register + login + me
- [x] JWT middleware
- [x] bcrypt hashing
- [x] Zod schemas
- [x] اختبارات integration لـ auth
- **بوابة:** تسجيل → login → `GET /me` يعمل

### 🟢 M3 — Tasks CRUD (10-12 ساعة)

- [x] CRUD كامل + ownership
- [x] فلترة + pagination + sorting
- [x] soft delete
- [x] error middleware موحّد
- [x] اختبارات
- **بوابة:** Postman collection كاملة للـ tasks

### 🟢 M4a — AI Keys / BYOK (6-8 ساعات)

- [x] `utils/encryption.ts` (AES-256-GCM) + اختباراته
- [x] CRUD للمفاتيح + masking
- [x] `providers/types.ts` (interface)
- **بوابة:** مفتاح يُحفظ مشفّرًا، ويُعرض masked

### 🟢 M4b — Provider Adapters (4-6 ساعات)

- [x] `groq.provider.ts` + `google.provider.ts` + `openrouter.provider.ts`
- [x] `validateKey()` لكل واحد
- [x] `listModels()`
- [x] `parseTask()` (استدعاء LLM)
- [x] اختبارات unit بmock
- **بوابة:** `POST /settings/ai-keys` يتحقق ويحفظ فعليًا

### 🟢 M5 — NL Endpoint (6-8 ساعات)

- [x] `POST /tasks/nl` يستخدم `getProvider(user.provider)`
- [x] prompt engineering + JSON schema output
- [x] validate-on-use (401 vs 429)
- [x] حفظ المهمة بـ `source: 'ai_nl'`
- **بوابة:** جملة إنجليزية/عربية → task منظمة

### 🟢 M6 — Docs + Tests (8-10 ساعات)

- [ ] Swagger annotations على كل endpoint
- [ ] Swagger UI على `/docs`
- [ ] Postman collection مُصدّر
- [ ] رفع coverage إلى 70%+
- **بوابة:** أي شخص يفتح `/docs` يفهم الـ API

### 🟢 M7 — Deploy (3-5 ساعات)

- [ ] Render Web Service + disk أو Postgres add-on
- [ ] Environment variables
- [ ] Live URL + `/health` يعمل
- [ ] README كامل + demo GIF
- **بوابة:** رابط حي في README

### 🟡 M8 — Roadmap (لاحقًا)

- [ ] Webhooks
- [ ] Idempotency keys
- [ ] MCP Server
- [ ] Audit log
- [ ] Rate limiting per user

---

## 7. قائمة الأمان (لا تتنازل عنها)

| البند                 | التنفيذ                                                  |
| --------------------- | -------------------------------------------------------- |
| ✅ Helmet             | `app.use(helmet())`                                      |
| ✅ CORS               | restricted origins                                       |
| ✅ Rate limit         | 100 req/15min عام + 10 req/min لـ `/auth`                |
| ✅ Password           | bcrypt cost 12                                           |
| ✅ JWT                | HS256 + secret قوي + expiry 7d                           |
| ✅ API Keys           | AES-256-GCM + `MASTER_ENCRYPTION_KEY` (32 bytes)         |
| ✅ SQL Injection      | Drizzle parameterized دائمًا                             |
| ✅ Ownership          | كل query `WHERE user_id = req.user.id`                   |
| ✅ No secrets in logs | Pino redact: `req.headers.authorization`, `body.api_key` |
| ✅ `.env`             | غير مرفوع، `.env.example` فقط                            |
| ✅ Zod                | validate كل input قبل أي DB call                         |

---

## 8. قالب `.env.example`

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=./data/app.db

JWT_SECRET=change_me_min_32_chars
JWT_EXPIRES_IN=7d

MASTER_ENCRYPTION_KEY=base64_32_bytes_here

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

LOG_LEVEL=info
```

---

## 9. هيكل README (ما سيراه العميل)

```text
1. 🎯 AgentTasks API — [شعار]
2. 📝 الوصف: "Task API built for humans, ready for AI agents."
3. ✨ Features (badges): TypeScript | Express | Drizzle | Swagger | BYOK
4. 🚀 Live Demo → [Render URL] + [Swagger UI] + [Postman Collection]
5. 🏗️ Architecture (diagram بسيط)
6. 🔐 Security Highlights
7. 🧠 AI-Native Features (BYOK + NL + LLM-friendly errors)
8. 📦 Quick Start (3 أوامر فقط)
9. 📚 API Reference (جدول الـ endpoints)
10. 🧪 Testing
11. 🗺️ Roadmap (Webhooks, MCP, Audit)
12. 📄 License
```
