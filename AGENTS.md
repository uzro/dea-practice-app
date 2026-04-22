# AGENTS.md

## Project Overview

This is a DEA exam practice web application built with Next.js with admin management interface.

Core goals:
- **Admin Interface**: Upload and manage DEA exam PDFs through web interface
- **Real-time Processing**: Convert PDFs to structured questions with live progress tracking
- **Question Review**: Batch approval workflow for processed questions
- **Question Bank Management**: Search, filter, and manage approved questions
- **Student Practice**: Online practice and mock exams

This project is **data-first with admin-driven workflow**, not UI-first.

---

## Tech Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind
- Backend: Next.js Route Handlers
- Database: PostgreSQL (via Prisma)
- File Storage: Vercel Blob
- Parsing: PDF → text → structured JSON (LLM-assisted, real-time)
- Authentication: Simple password protection (admin only)
- Deployment: Vercel

---

## Core Principles

1. **Data-first design**
   - Question schema is the foundation
   - ProcessingJob tracking for workflow management

2. **Admin-driven workflow**
   - All content management through admin interface
   - Real-time processing with status tracking

3. **Deterministic backend**
   - APIs must NOT depend on raw PDF
   - Structured data only in database

4. **Separation of concerns**
   - Admin functions isolated from student interface
   - Clear API boundaries between admin/student features

5. **Extensibility**
   - Must support multiple exams
   - Must support tags, difficulty, explanations

---

## Data Models

### Question Data Model

```ts
export type Question = {
  id: string
  exam: string

  sourcePdf?: string
  sourcePageStart?: number
  sourcePageEnd?: number

  questionNo?: string

  type: "single" | "multiple" | "true_false" | "text"

  stem: string

  options?: {
    key: string
    text: string
  }[]

  answer: string[]

  explanation?: string

  difficulty?: "easy" | "medium" | "hard"

  tags?: string[]

  status: "pending" | "approved" | "rejected"  // NEW: Review workflow

  createdAt: string
  updatedAt: string
}
```

### ProcessingJob Data Model (NEW)

```ts
export type ProcessingJob = {
  id: string
  filename: string
  fileUrl: string
  status: "uploading" | "processing" | "completed" | "failed"
  progress: number
  questionsExtracted: number
  error?: string
  createdAt: string
  updatedAt: string
}
```

Rules:
- Never store raw PDF content in database
- Always store structured data
- Answer must always be an array
- All questions start as "pending" until approved

---

## Project Structure (Updated)

```
/app
  /admin                 → Admin interface (NEW)
    layout.tsx          → Admin navigation & auth
    page.tsx           → Dashboard
    /upload            → PDF upload interface
    /review            → Question approval workflow  
    /questions         → Question bank management
  /api
    /admin             → Admin-only endpoints (NEW)
    /questions         → Student question APIs
    /submit            → Answer submission
/components            → UI components
/lib                   → utilities (db, helpers, pdf-processor)
/db                    → schema, prisma
/types                 → shared types (Question, ProcessingJob)
/middleware.ts         → Admin authentication (NEW)
```

**Key Changes:**
- Added `/app/admin/` for management interface
- Added `/app/api/admin/` for admin-only APIs  
- Added `/lib/pdf-processor.ts` for real-time processing
- Added `/types/processing.ts` for job tracking
- Added `/middleware.ts` for admin auth

---

## Processing Workflow (Updated)

**Real-time Web-based Processing** (not offline scripts):

1. **Admin Upload**: PDF upload through admin interface with drag-drop
2. **Storage**: File saved to Vercel Blob with job creation
3. **Processing**: Real-time PDF→text→structured JSON (LLM-assisted)
4. **Review**: Batch approval interface for all extracted questions
5. **Approval**: Questions moved from "pending" → "approved" status
6. **Student Access**: Only approved questions available in student APIs

Rules:
- Processing happens through admin web interface
- Real-time status tracking with progress updates
- Manual review required before questions go live
- Must output valid Question format

---

## Development Phases (Updated)

**Phase 1: Foundation**
- Question & ProcessingJob schemas
- Database setup with Prisma
- Basic admin authentication

**Phase 2: Admin Core**
- PDF upload interface
- Real-time processing pipeline
- Job status tracking

**Phase 3: Question Management**
- Batch review workflow
- Question approval/rejection
- Question bank management

**Phase 4: Student APIs**
- Question retrieval APIs
- Answer submission
- Filtering and pagination

**Phase 5: Student Interface**
- Practice UI components
- Session management
- Answer feedback

**Phase 6: Advanced Features**
- Mock exams
- Wrong question tracking
- Analytics dashboard

---

## API Design (Updated)

### Admin APIs (NEW)
- POST /api/admin/upload - PDF file upload
- GET /api/admin/jobs - Processing job status
- GET /api/admin/review - Pending questions for approval
- POST /api/admin/approve - Approve/reject questions
- GET /api/admin/questions - Question bank management
- PUT /api/admin/questions/[id] - Edit question

### Student APIs  
- GET /api/questions - Approved questions only
- GET /api/questions/[id] - Single question
- POST /api/submit - Answer submission

---

## Authentication & Security

**Admin Protection:**
- Simple password-based middleware
- Environment variable: `ADMIN_PASSWORD`
- Protects all `/admin/*` routes and `/api/admin/*` endpoints

**Student Access:**
- No authentication required for practice
- Anonymous sessions for now
- Future: optional user accounts

---

## Things to Avoid

- Do NOT parse PDF during student requests
- Do NOT mix admin/student functionality
- Do NOT store raw PDF content in database
- Do NOT hardcode logic in frontend
- Do NOT assume only one exam
- Do NOT bypass review workflow

---

## Agent Instructions

When working on this project:

- Always read this file first
- Follow Question schema strictly
- Implement admin workflow completely before student features
- Use real-time processing, not offline scripts
- Work step by step through phases
- Ask before breaking changes
- Test admin authentication thoroughly

---

## Current Priority (Updated)

**Phase 1 Focus:**

1. **Question & ProcessingJob schemas** - Foundation data models
2. **Database setup** - Prisma with PostgreSQL  
3. **Admin authentication** - Simple password protection
4. **PDF upload system** - File handling with job tracking

**Next:** Real-time processing pipeline and review workflow

---

## Notes

- This is a long-term project
- Admin workflow must be bulletproof
- Accuracy is more important than speed
- Manual review is required for all questions
- Real-time feedback improves admin experience
- Student interface comes after admin is solid
