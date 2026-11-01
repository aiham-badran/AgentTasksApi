# 📘 PRD — AgentTasks API

**Product Requirements Document — النسخة 1.0**

| الحقل           | القيمة                                                  |
| --------------- | ------------------------------------------------------- |
| **اسم المنتج**  | AgentTasks API                                          |
| **الشعار**      | _"Task backend built for humans, ready for AI agents."_ |
| **الإصدار**     | v1.0 (MVP)                                              |
| **نوع المشروع** | SaaS Portfolio Project (قابل للتوسع تجاريًا)            |
| **المالك**      | [اسمك]                                                  |
| **الحالة**      | Draft → Ready for Development                           |
| **آخر تحديث**   | 2026-10-31                                              |

---

## 1. الملخص التنفيذي (Executive Summary)

**AgentTasks API** هي واجهة برمجية (REST API) لإدارة المهام، مصممة من اليوم الأول لتكون **صديقة للـ AI Agents** وليس فقط للبشر. توفر مصادقة مزدوجة (JWT للمستخدمين + API Keys للـ Agents)، نظام BYOK (Bring Your Own Key) للتحكم بمزودي الـ LLM (Groq / Google Gemini / OpenRouter)، نقاط نهاية باللغة الطبيعية (Natural Language)، واستجابات أخطاء منظمة تفهمها الـ LLMs.

المنتج يُقدَّم كـ **SaaS في معرض الأعمال (Portfolio)** لإثبات مهارات: Backend Engineering, Security, Multi-provider Integration, API Design, Documentation, و Deployment.

---

## 2. المشكلة (Problem Statement)

### 2.1 السياق

في 2025-2026، ازداد بناء **AI Agents** (LangChain, CrewAI, Claude MCP, OpenAI Assistants) بشكل هائل. هذه الـ Agents تحتاج **Backend** لإدارة المهام، لكن معظم أدوات إدارة المهام الحالية (Todoist, Trello, Asana) لم تُصمَّم للـ Agents:

| المشكلة                       | التفصيل                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| **مصادقة غير مناسبة**         | معظم الـ APIs تستخدم OAuth للمستخدمين، لكن الـ Agents تحتاج API Keys طويلة العمر مع scopes |
| **أخطاء غير مفهومة للـ LLMs** | الـ LLMs تحتاج `hint` و `suggested_action` و`docs_url` — لا يوجد في APIs التقليدية         |
| **لا Natural Language**       | الـ Agents تفكر باللغة الطبيعية، لكن معظم APIs تُجبر على JSON صارم                         |
| **تكلفة عالية**               | SaaS التقليدي يفرض اشتراكًا شهريًا + استهلاك LLM داخلي                                     |
| **لا Traceability**           | لا توجد طريقة لمعرفة "أي agent فعل ماذا"                                                   |

### 2.2 الحل الذي نقدمه

| الميزة                        | القيمة                                             |
| ----------------------------- | -------------------------------------------------- |
| **Auth مزدوج**                | JWT للمطورين + API Keys للـ Agents                 |
| **BYOK**                      | المستخدم يمرر مفتاحه → صفر تكلفة عليك              |
| **Natural Language Endpoint** | "remind me to call Sara tomorrow 5pm" → مهمة منظمة |
| **LLM-Friendly Errors**       | أخطاء مفهومة للـ LLMs                              |
| **Multi-Provider**            | Groq + Google + OpenRouter                         |
| **Source Tracking**           | كل مهمة تعرف أصلها (manual / ai_nl / webhook)      |

---

## 3. الجمهور المستهدف (Target Audience)

### 3.1 Persona الأساسية — **AI Agent Developer**

- **الاسم:** Karim, 28
- **الدور:** Full-stack dev يبني AI Agent بـ LangChain/CrewAI
- **الألم:** يحتاج Backend لإدارة مهام الـ Agent، لكن كل حلول SaaS مكلفة أو غير مخصصة
- **الحل:** AgentTasks API مع BYOK → يستخدم مفتاح Groq المجاني
- **المقياس:** Time-to-first-task < 5 دقائق

### 3.2 Persona الثانوية — **No-code Builder**

- **الاسم:** Layla, 32
- **الدور:** تبني workflows على Make/n8n
- **الألم:** تحتاج API بسيط يُدمج مع HTTP module
- **الحل:** Swagger UI + Postman collection + error hints واضحة

### 3.3 Persona الثالثة — **Technical Recruiter / Client**

- تفتح GitHub/LinkedIn وتقيّم المشروع في 3 دقائق
- **المطلوب منها:** README احترافي + Live URL + Demo video

---

## 4. الأهداف ومقاييس النجاح (Goals & KPIs)

### 4.1 أهداف المنتج

| #   | الهدف                           | مقياس النجاح                          |
| --- | ------------------------------- | ------------------------------------- |
| G1  | إثبات مهارة Backend Engineering | Live URL + 70%+ test coverage         |
| G2  | إظهار فهم AI-Native Design      | Natural Language endpoint يعمل فعليًا |
| G3  | إثبات مهارة الأمان              | AES-256-GCM + no plaintext keys       |
| G4  | توثيق احترافي                   | Swagger UI + Postman + README كامل    |
| G5  | جذب عملاء/توظيف                 | 10+ GitHub stars في أول شهر           |

### 4.2 غير الأهداف (Non-Goals) — v1

- ❌ بناء Frontend (React/Next) — مؤجل
- ❌ Mobile app — مؤجل
- ❌ Teams/Workspaces (multi-user per account) — مؤجل
- ❌ Billing/Subscriptions — مؤجل
- ❌ Notifications (email/push) — مؤجل
- ❌ File attachments — مؤجل
- ❌ MCP Server — مؤجل لـ v2 (مذكور في Roadmap)

---

## 5. المتطلبات الوظيفية (Functional Requirements)

### 5.1 وحدة المصادقة (Auth Module)

#### FR-AUTH-01: تسجيل مستخدم جديد

- **Endpoint:** `POST /api/v1/auth/register`
- **Body:** `{ email, password, name }`
- **التحقق:**
  - email: صالح، غير مسجل سابقًا
  - password: 8+ أحرف، حرف كبير، رقم
  - name: 2-100 حرف
- **الاستجابة:** `201 Created` + `{ user: { id, email, name }, token }`
- **الأخطاء:**
  - `409 AUTH_EMAIL_EXISTS` إذا مسجل
  - `422 VALIDATION_FAILED` لأي حقل خاطئ

#### FR-AUTH-02: تسجيل الدخول

- **Endpoint:** `POST /api/v1/auth/login`
- **Body:** `{ email, password }`
- **الاستجابة:** `200 OK` + `{ user, token }`
- **الأخطاء:** `401 AUTH_INVALID` (لا نفرق بين email خاطئ أو password خاطئ — أمان)

#### FR-AUTH-03: الملف الشخصي

- **Endpoint:** `GET /api/v1/auth/me`
- **Auth:** Bearer JWT
- **الاستجابة:** `200 OK` + `{ id, email, name, created_at, stats: { total_tasks, completed_tasks, providers_configured } }`

#### FR-AUTH-04: JWT Middleware

- كل الطلبات المحمية تُمرَّر عبر `authMiddleware`
- يتحقق من التوقيع والانتهاء
- يُرفق `req.user = { id, email }`
- **الأخطاء:**
  - `401 AUTH_REQUIRED` (لا token)
  - `401 AUTH_INVALID` (token منتهٍ أو خاطئ)

---

### 5.2 وحدة إدارة مفاتيح AI (AI Keys / BYOK)

#### FR-KEYS-01: إضافة مفتاح مزوّد

- **Endpoint:** `POST /api/v1/settings/ai-keys`
- **Auth:** Bearer JWT
- **Body:** `{ provider: "groq" | "google" | "openrouter", api_key: string }`
- **التدفق:**
  1. التحقق من صحة `provider` (enum)
  2. **التحقق من المفتاح عبر الـ provider adapter** (Validate-on-Save)
  3. إذا صالح → تشفير AES-256-GCM → حفظ
  4. إذا غير صالح → `401 AI_KEY_INVALID`
  5. إذا quota exceeded → `429 AI_QUOTA_EXCEEDED` (لا نحفظ المفتاح)
- **الاستجابة:** `201 Created` + `{ id, provider, masked_key, is_active, last_validated_at }`
- **قيود:**
  - مفتاح واحد فقط لكل provider لكل مستخدم (`UNIQUE(user_id, provider)`)
  - إعادة الإرسال لنفس provider = `409` أو تحديث (نفضّل التحديث مع `PUT`)

#### FR-KEYS-02: عرض المفاتيح

- **Endpoint:** `GET /api/v1/settings/ai-keys`
- **Auth:** Bearer JWT
- **الاستجابة:** `200 OK` + مصفوفة بالمفاتيح
- **⚠️ قاعدة أمنية صارمة:** يُرجع `masked_key` فقط (مثل `sk-...a1b2`) — **لا يُرجع المفتاح الكامل أبدًا**

#### FR-KEYS-03: حذف مفتاح

- **Endpoint:** `DELETE /api/v1/settings/ai-keys/:provider`
- **Auth:** Bearer JWT
- **الاستجابة:** `204 No Content`

#### FR-KEYS-04: إعادة التحقق اليدوي

- **Endpoint:** `POST /api/v1/settings/ai-keys/:provider/validate`
- **Auth:** Bearer JWT
- **الاستجابة:** `200 OK` + `{ valid: true, usage: { used, limit } }`

#### FR-KEYS-05: قائمة الموديلات المتاحة

- **Endpoint:** `GET /api/v1/settings/ai-keys/:provider/models`
- **Auth:** Bearer JWT
- **الاستجابة:** `200 OK` + مصفوفة موديلات (من الـ provider API)

#### FR-KEYS-06: التشفير عند التخزين

- **الخوارزمية:** AES-256-GCM
- **المفتاح الرئيسي:** `MASTER_ENCRYPTION_KEY` (32 bytes, base64 في `.env`)
- **لكل مفتاح:**
  - `iv`: 12 bytes عشوائي (base64)
  - `auth_tag`: 16 bytes (base64)
  - `encrypted_key`: ciphertext (base64)
- **يُخزَّن إضافيًا:** `key_prefix` = آخر 4 أحرف (للعرض masked)

#### FR-KEYS-07: سلوك عند غياب المفتاح

- أي استدعاء لـ `/tasks/nl` بدون مفتاح → `428 AI_KEY_MISSING` مع `hint` واضح

---

### 5.3 وحدة المهام (Tasks)

#### FR-TASK-01: إنشاء مهمة

- **Endpoint:** `POST /api/v1/tasks`
- **Auth:** Bearer JWT
- **Body:**
  ```json
  {
    "title": "Call Sara",
    "description": "Discuss project",
    "priority": "high",
    "due_date": "2026-11-01T17:00:00Z"
  }
  ```
- **التحقق:**
  - title: 1-200 حرف (مطلوب)
  - priority: enum (`low|medium|high|urgent`)، افتراضي `medium`
  - due_date: ISO 8601، future date
- **الاستجابة:** `201 Created` + المهمة كاملة
- **ملاحظة:** `source` يكون دائمًا `manual` في هذا endpoint

#### FR-TASK-02: قائمة المهام (مع فلترة + pagination)

- **Endpoint:** `GET /api/v1/tasks`
- **Auth:** Bearer JWT
- **Query Params:**
  | Param | Type | Default | ملاحظة |
  |-------|------|---------|--------|
  | `status` | enum | — | `pending\|in_progress\|completed\|cancelled` |
  | `priority` | enum | — | `low\|medium\|high\|urgent` |
  | `search` | string | — | يبحث في title + description |
  | `due_before` | ISO date | — | تصفية حسب تاريخ الاستحقاق |
  | `due_after` | ISO date | — | — |
  | `page` | int | 1 | ≥ 1 |
  | `limit` | int | 20 | 1-100 |
  | `sort` | string | `created_at:desc` | `field:asc\|desc` |
- **الاستجابة:** `200 OK`
  ```json
  {
    "data": [...],
    "pagination": {
      "page": 1, "limit": 20,
      "total": 45, "total_pages": 3,
      "has_next": true, "has_prev": false
    }
  }
  ```
- **قاعدة:** كل النتائج مفلترة بـ `user_id = req.user.id AND deleted_at IS NULL`

#### FR-TASK-03: عرض مهمة واحدة

- **Endpoint:** `GET /api/v1/tasks/:id`
- **Auth:** Bearer JWT
- **الاستجابة:** `200 OK` + المهمة
- **الأخطاء:** `404 TASK_NOT_FOUND` (حتى لو موجودة لكن لمستخدم آخر — لا نكشف وجودها)

#### FR-TASK-04: تعديل مهمة (جزئي)

- **Endpoint:** `PATCH /api/v1/tasks/:id`
- **Auth:** Bearer JWT
- **Body:** أي من `{ title, description, priority, due_date, status }`
- **الاستجابة:** `200 OK`
- **قواعد:**
  - لا يمكن تعديل `source` أو `metadata` يدويًا
  - تغيير `status` إلى `completed` → يعين `completed_at = now()`
  - تغيير `status` من `completed` → يعيد `completed_at = null`

#### FR-TASK-05: حذف مهمة (Soft Delete)

- **Endpoint:** `DELETE /api/v1/tasks/:id`
- **Auth:** Bearer JWT
- **الاستجابة:** `204 No Content`
- **قاعدة:** يعيّن `deleted_at = now()` — لا يحذف من DB فعليًا

#### FR-TASK-06: إكمال مهمة (Convenience)

- **Endpoint:** `POST /api/v1/tasks/:id/complete`
- **Auth:** Bearer JWT
- **الاستجابة:** `200 OK` + المهمة محدّثة

#### FR-TASK-07: إعادة فتح مهمة

- **Endpoint:** `POST /api/v1/tasks/:id/reopen`
- **Auth:** Bearer JWT
- **الاستجابة:** `200 OK`

---

### 5.4 وحدة المهام باللغة الطبيعية (NL Tasks) ⭐

#### FR-NL-01: إنشاء مهمة من نص طبيعي

- **Endpoint:** `POST /api/v1/tasks/nl`
- **Auth:** Bearer JWT
- **Body:**
  ```json
  {
    "text": "remind me to call Sara tomorrow 5pm",
    "provider": "groq",
    "model": "openai/gpt-oss-120b"
  }
  ```
- **`provider`:** اختياري (افتراضي: أول مفتاح متاح للمستخدم)
- **`model`:** اختياري (افتراضي: موديل موصى به لكل provider)

#### FR-NL-02: التدفق الداخلي

1. التحقق من وجود مفتاح نشط للمستخدم للـ provider المطلوب → `428 AI_KEY_MISSING` إن لا
2. فك تشفير المفتاح (in-memory فقط)
3. بناء prompt مع JSON schema صارم (structured output)
4. استدعاء الـ LLM عبر adapter
5. parse + validate الناتج بـ Zod
6. حفظ المهمة مع:
   - `source = 'ai_nl'`
   - `metadata = { provider, model, confidence, raw_text, tokens_used }`
7. إرجاع المهمة

#### FR-NL-03: Prompt Design (مطلوب)

Prompt يجب أن يُجبر الـ LLM على إرجاع JSON بالشكل:

```json
{
  "title": "Call Sara",
  "description": null,
  "priority": "medium",
  "due_date": "2026-11-01T17:00:00Z",
  "confidence": 0.92
}
```

- `priority` افتراضي `medium` إذا لم يُذكر
- `due_date` = `null` إذا لم يُذكر
- `confidence` = 0.0 - 1.0 (يقيسها الـ LLM)

#### FR-NL-04: Validate-on-Use (⭐ الميزة الحرجة)

عند استدعاء الـ LLM:

- إذا رجع `401` → `401 AI_KEY_INVALID` + رسالة "your key is invalid or revoked"
- إذا رجع `429` → `429 AI_QUOTA_EXCEEDED` + رسالة "your provider quota is exhausted, try Groq or wait"
- إذا رجع `5xx` → `502 AI_PROVIDER_ERROR` (retryable: true)
- **هذا التمييز مهم جدًا** لأن `429` يعني المفتاح صالح لكن throttle — لا نطلب من المستخدم تحديثه

#### FR-NL-05: حدود

- `text` max 1000 حرف
- timeout للـ LLM: 15 ثانية
- retry logic: محاولة واحدة إضافية عند `5xx`

---

## 6. المتطلبات غير الوظيفية (Non-Functional Requirements)

### 6.1 الأداء

| المقياس                  | الهدف   |
| ------------------------ | ------- |
| p95 response time (CRUD) | < 200ms |
| p95 response time (NL)   | < 5s    |
| Concurrent requests      | 100     |
| DB size (SQLite)         | < 100MB |

### 6.2 الأمان

| البند            | المتطلب                         |
| ---------------- | ------------------------------- |
| Password hashing | bcrypt cost 12                  |
| JWT              | HS256, 7d expiry                |
| API Keys         | AES-256-GCM at rest             |
| SQL Injection    | Drizzle parameterized           |
| Rate limiting    | 100/15min عام + 10/min auth     |
| Headers          | helmet                          |
| CORS             | allowlist                       |
| Logs             | **لا تُسجّل أي مفتاح أو token** |

### 6.3 التوثيق

| البند      | المتطلب                                             |
| ---------- | --------------------------------------------------- |
| OpenAPI    | 3.0 spec كامل                                       |
| Swagger UI | متاح على `/docs`                                    |
| Postman    | collection في `docs/postman-collection.json`        |
| README     | باللغة الإنجليزية، يشمل: setup, endpoints, examples |
| Demo       | GIF قصير أو video                                   |

### 6.4 الاختبارات

| النوع             | الهدف                                 |
| ----------------- | ------------------------------------- |
| Unit tests        | 80%+ في utils (encryption, providers) |
| Integration tests | Auth + Tasks + AI Keys main flows     |
| Coverage الكلي    | 70%+                                  |
| Test framework    | Vitest + Supertest                    |

### 6.5 النشر

| البند           | القيمة               |
| --------------- | -------------------- |
| المنصة          | Render (Web Service) |
| Region          | Frankfurt أو Ohio    |
| Persistent disk | لـ SQLite            |
| Health check    | `/health`            |
| Env vars        | عبر Render Dashboard |

---

## 7. المعمارية التقنية (Technical Architecture)

### 7.1 Stack

| Layer      | Choice                             |
| ---------- | ---------------------------------- |
| Runtime    | Node.js 20 LTS                     |
| Language   | TypeScript 5+                      |
| Framework  | Express 4                          |
| ORM        | Drizzle                            |
| DB         | SQLite (better-sqlite3)            |
| Validation | Zod                                |
| Auth       | JWT + bcrypt                       |
| Docs       | swagger-jsdoc + swagger-ui-express |
| Testing    | Vitest + Supertest                 |
| Logging    | Pino                               |
| Deploy     | Render                             |

### 7.2 مبدأ المعمارية

- **Feature-based modules** (auth, tasks, ai-keys, nl-tasks)
- **Layered per module** (routes → controller → service → db)
- **Adapter Pattern** للـ providers
- **Centralized error handling** + unified error shape
- **Env validation at startup** (فشل سريع)

### 7.3 مخطط الـ Request Flow

```
Client
  → Express Router
  → Rate Limiter
  → Auth Middleware (JWT)
  → Validation (Zod)
  → Controller
  → Service
  → Drizzle ORM
  → SQLite

(في NL endpoint):
Service → Provider Adapter → LLM API → Parse → Save
```

---

## 8. نموذج البيانات (Data Model)

### 8.1 جدول `users`

| العمود        | النوع     | ملاحظات         |
| ------------- | --------- | --------------- |
| id            | UUID      | PK              |
| email         | TEXT      | UNIQUE, INDEXED |
| password_hash | TEXT      | bcrypt          |
| name          | TEXT      |                 |
| created_at    | TIMESTAMP |                 |
| updated_at    | TIMESTAMP |                 |

### 8.2 جدول `api_keys`

| العمود            | النوع     | ملاحظات                       |
| ----------------- | --------- | ----------------------------- |
| id                | UUID      | PK                            |
| user_id           | UUID      | FK → users, CASCADE           |
| provider          | TEXT      | groq/google/openrouter        |
| encrypted_key     | TEXT      | ciphertext (base64)           |
| iv                | TEXT      | base64                        |
| auth_tag          | TEXT      | base64                        |
| key_prefix        | TEXT      | آخر 4 أحرف                    |
| is_active         | BOOLEAN   | default true                  |
| last_validated_at | TIMESTAMP |                               |
| created_at        | TIMESTAMP |                               |
| updated_at        | TIMESTAMP |                               |
| —                 | —         | **UNIQUE(user_id, provider)** |

### 8.3 جدول `tasks`

| العمود       | النوع     | ملاحظات                          |
| ------------ | --------- | -------------------------------- |
| id           | UUID      | PK                               |
| user_id      | UUID      | FK → users, INDEXED              |
| title        | TEXT      |                                  |
| description  | TEXT      | nullable                         |
| status       | TEXT      | enum, default 'pending'          |
| priority     | TEXT      | enum, default 'medium'           |
| due_date     | TIMESTAMP | nullable                         |
| completed_at | TIMESTAMP | nullable                         |
| source       | TEXT      | 'manual' \| 'ai_nl' \| 'webhook' |
| metadata     | JSON      | nullable                         |
| created_at   | TIMESTAMP |                                  |
| updated_at   | TIMESTAMP |                                  |
| deleted_at   | TIMESTAMP | soft delete                      |

---

## 9. واجهة الـ API (API Specification)

### 9.1 ملخص الـ Endpoints

| #   | Method | Path                                          | Auth | الوصف                      |
| --- | ------ | --------------------------------------------- | ---- | -------------------------- |
| 1   | GET    | `/health`                                     | ❌   | Health check               |
| 2   | POST   | `/api/v1/auth/register`                       | ❌   | تسجيل                      |
| 3   | POST   | `/api/v1/auth/login`                          | ❌   | دخول                       |
| 4   | GET    | `/api/v1/auth/me`                             | ✅   | الملف الشخصي               |
| 5   | POST   | `/api/v1/settings/ai-keys`                    | ✅   | إضافة مفتاح                |
| 6   | GET    | `/api/v1/settings/ai-keys`                    | ✅   | عرض المفاتيح               |
| 7   | DELETE | `/api/v1/settings/ai-keys/:provider`          | ✅   | حذف                        |
| 8   | POST   | `/api/v1/settings/ai-keys/:provider/validate` | ✅   | إعادة تحقق                 |
| 9   | GET    | `/api/v1/settings/ai-keys/:provider/models`   | ✅   | قائمة موديلات              |
| 10  | POST   | `/api/v1/tasks`                               | ✅   | إنشاء مهمة                 |
| 11  | GET    | `/api/v1/tasks`                               | ✅   | قائمة + فلترة + pagination |
| 12  | GET    | `/api/v1/tasks/:id`                           | ✅   | عرض                        |
| 13  | PATCH  | `/api/v1/tasks/:id`                           | ✅   | تعديل                      |
| 14  | DELETE | `/api/v1/tasks/:id`                           | ✅   | حذف (soft)                 |
| 15  | POST   | `/api/v1/tasks/:id/complete`                  | ✅   | إكمال                      |
| 16  | POST   | `/api/v1/tasks/:id/reopen`                    | ✅   | إعادة فتح                  |
| 17  | POST   | `/api/v1/tasks/nl`                            | ✅   | ⭐ من نص طبيعي             |

### 9.2 شكل الخطأ الموحّد (LLM-Friendly)

```json
{
  "error": {
    "code": "AI_KEY_INVALID",
    "message": "Your Groq API key is invalid or has been revoked.",
    "hint": "Update your key at POST /api/v1/settings/ai-keys",
    "suggested_action": "reauth_provider",
    "docs_url": "https://your-api.onrender.com/docs#ai-keys",
    "request_id": "req_abc123",
    "retryable": false
  }
}
```

### 9.3 جدول أكواد الأخطاء

| Code                | HTTP | متى                     |
| ------------------- | ---- | ----------------------- |
| `AUTH_REQUIRED`     | 401  | لا token                |
| `AUTH_INVALID`      | 401  | token خاطئ/منتهٍ        |
| `AUTH_EMAIL_EXISTS` | 409  | email مسجل              |
| `TASK_NOT_FOUND`    | 404  | مهمة غير موجودة         |
| `TASK_FORBIDDEN`    | 403  | ليست للمستخدم           |
| `VALIDATION_FAILED` | 422  | Zod errors              |
| `AI_KEY_MISSING`    | 428  | لا مفتاح للمزود         |
| `AI_KEY_INVALID`    | 401  | المفتاح مرفوض من المزود |
| `AI_QUOTA_EXCEEDED` | 429  | حصة مستنفدة             |
| `AI_PROVIDER_ERROR` | 502  | خطأ من المزود (5xx)     |
| `AI_TIMEOUT`        | 504  | LLM timeout             |
| `RATE_LIMITED`      | 429  | rate limit              |
| `INTERNAL_ERROR`    | 500  | خطأ غير متوقع           |

---

## 10. طبقة المزوّدين (Provider Abstraction)

### 10.1 الواجهة الموحدة

```typescript
interface LLMProvider {
  id: "groq" | "google" | "openrouter";
  validateKey(apiKey: string): Promise<ValidateResult>;
  listModels(apiKey: string): Promise<ModelInfo[]>;
  parseTask(input: string, apiKey: string, model?: string): Promise<TaskDraft>;
}

interface ValidateResult {
  valid: boolean;
  status: "ok" | "invalid_key" | "quota_exceeded" | "region_blocked";
  message?: string;
  usage?: { used: number; limit: number | null };
}
```

### 10.2 تفاصيل كل مزوّد

| Provider       | Validate Endpoint            | Models Endpoint      | Base URL                                    |
| -------------- | ---------------------------- | -------------------- | ------------------------------------------- |
| **Groq**       | `GET /openai/v1/models`      | نفسها                | `https://api.groq.com`                      |
| **Google**     | `GET /v1beta/models?key=...` | نفسها                | `https://generativelanguage.googleapis.com` |
| **OpenRouter** | `GET /api/v1/auth/key` ⭐    | `GET /api/v1/models` | `https://openrouter.ai/api`                 |

### 10.3 الموديلات الافتراضية

| Provider   | Default Model         |
| ---------- | --------------------- |
| Groq       | `openai/gpt-oss-120b` |
| Google     | `gemini-2.0-flash`    |
| OpenRouter | `openai/gpt-4o-mini`  |

> **ملاحظة:** الموديلات تُقرأ ديناميكيًا من `listModels()` — لا تُثبّت (hardcode) لأن المزودين يغيّرونها.

---

## 11. الوثائق (Documentation Requirements)

### 11.1 Swagger / OpenAPI

- OpenAPI 3.0 spec
- Swagger UI على `/docs`
- كل endpoint موثّق مع:
  - Description
  - Request schema
  - Response schema
  - Error responses
  - Example request/response

### 11.2 Postman Collection

- ملف `docs/postman-collection.json`
- يحتوي folder لكل module
- Environment variables: `baseUrl`, `token`, `taskId`
- Test scripts تأخذ token تلقائيًا

### 11.3 README (باللغة الإنجليزية)

الأقسام المطلوبة:

1. Hero (اسم + tagline + badges)
2. Live Demo links (API + Swagger + Postman)
3. Features (bullets)
4. Architecture diagram
5. Security highlights
6. AI-Native features (BYOK + NL + LLM errors)
7. Quick Start (3 أوامر)
8. API Reference (جدول)
9. Testing
10. Roadmap
11. License

---

## 12. النشر (Deployment)

### 12.1 Render Configuration

```
Service Type: Web Service
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
Health Check Path: /health
Region: Frankfurt (EU) — لجذب العملاء الأوروبيين
```

### 12.2 Environment Variables (Render)

```
NODE_ENV=production
PORT=10000
DATABASE_URL=/var/data/app.db
JWT_SECRET=<32+ chars>
JWT_EXPIRES_IN=7d
MASTER_ENCRYPTION_KEY=<base64 32 bytes>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

### 12.3 Persistent Disk

- Mount path: `/var/data`
- Size: 1GB (Free Tier)

---

## 13. المراحل (Milestones & Acceptance Criteria)

| #       | Milestone            | Acceptance Criteria                           |
| ------- | -------------------- | --------------------------------------------- |
| **M0**  | Setup                | `curl /health` → `{status: "ok"}`             |
| **M1**  | DB Schema            | `npm run db:migrate` ينجح + seed يعمل         |
| **M2**  | Auth                 | register → login → `GET /me` يعمل + اختبارات  |
| **M3**  | Tasks CRUD           | كل الـ endpoints تعمل + Postman collection    |
| **M4a** | AI Keys + Encryption | مفتاح يُحفظ مشفّرًا + يُعرض masked + اختبارات |
| **M4b** | Provider Adapters    | الثلاثة يتحققون ويستدعون LLM فعليًا           |
| **M5**  | NL Endpoint          | جملة → مهمة منظمة + validate-on-use يعمل      |
| **M6**  | Docs + Tests         | Swagger UI + Postman + coverage 70%+          |
| **M7**  | Deploy               | Live URL في README + `/docs` متاح             |

---

## 14. المخاطر والتخفيف (Risks & Mitigation)

| المخاطرة               | الاحتمال | التأثير | التخفيف                                              |
| ---------------------- | -------- | ------- | ---------------------------------------------------- |
| مزود يغير API          | متوسط    | عالي    | Adapter pattern + validate-on-use + مراقبة changelog |
| موديل يتوقف            | عالي     | منخفض   | قراءة `listModels()` ديناميكيًا                      |
| SQLite limits          | منخفض    | متوسط   | Drizzle يسهّل الانتقال لـ Postgres                   |
| تسريب مفاتيح في logs   | منخفض    | عالي    | Pino redact + مراجعة كل log statement                |
| Render free tier sleep | عالي     | منخفض   | ذكر ذلك في README + استخدام cron ping                |
| LLM يعيد JSON غير صالح | متوسط    | متوسط   | Zod validation + retry + fallback                    |
| Prompt injection       | متوسط    | متوسط   | system prompt صارم + output validation               |
| انتهاء مفتاح المستخدم  | متوسط    | متوسط   | validate-on-use + رسالة واضحة                        |

---

## 15. Roadmap (v2+)

| الميزة                     | الأولوية | الوصف                                       |
| -------------------------- | -------- | ------------------------------------------- |
| **Webhooks**               | P1       | task.created/updated/overdue events         |
| **Idempotency Keys**       | P1       | لـ retries من الـ Agents                    |
| **MCP Server**             | P1       | يسمح لـ Claude Desktop باستخدام API كـ tool |
| **Audit Log**              | P2       | كل action موثّق                             |
| **Rate Limiting per User** | P2       | حدود مخصصة                                  |
| **Teams/Workspaces**       | P2       | multi-user                                  |
| **Billing**                | P3       | Stripe                                      |
| **Frontend Dashboard**     | P3       | React/Next                                  |
| **Email Notifications**    | P3       | —                                           |
| **Recurring Tasks**        | P3       | cron-based                                  |
| **File Attachments**       | P3       | S3/R2                                       |
| **PostgreSQL Migration**   | P2       | production-ready                            |

---

## 16. معايير القبول النهائية (Definition of Done)

المشروع يُعتبر **مكتملًا لـ v1** عندما يتحقق:

- [ ] Live URL يعمل و`/health` يرجع `200`
- [ ] Swagger UI متاح على `/docs` ويعمل
- [ ] README احترافي بالإنجليزية + Demo GIF
- [ ] Postman collection في `docs/`
- [ ] test coverage ≥ 70%
- [ ] كل الـ 17 endpoint يعملون
- [ ] BYOK يعمل مع Groq + Google + OpenRouter
- [ ] Natural Language endpoint يحوّل جملة → task
- [ ] التشفير AES-256-GCM يعمل ومُختبر
- [ ] لا مفاتيح في logs (تم اختبار ذلك)
- [ ] Rate limiting مُفعّل
- [ ] Validation-on-Use يميز بين 401 و429
- [ ] مستخدم جديد يمكنه: register → add key → create NL task في < 5 دقائق

---

## 17. الملاحق (Appendices)

### A. `.env.example` كامل

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=./data/app.db

JWT_SECRET=change_me_to_32_chars_minimum_please
JWT_EXPIRES_IN=7d

MASTER_ENCRYPTION_KEY=base64_32_bytes_here_replace_me

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

LOG_LEVEL=info
```

### B. أوامر NPM المقترحة

```json
{
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "test": "vitest",
  "test:coverage": "vitest --coverage",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:seed": "tsx src/db/seed.ts",
  "lint": "eslint src --ext .ts",
  "format": "prettier --write \"src/**/*.ts\""
}
```

### C. Badges المقترحة للـ README

```markdown
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-orange)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)
```
