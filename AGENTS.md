# AGENTS.md - DEA Exam Practice App

## Project Overview

This is a DEA exam practice web application built with Next.js with admin management interface.

**Core Architecture:**
- **Admin-First Design**: All content flows through admin review and approval
- **AI-Powered Processing**: PDF-to-question extraction using OpenAI GPT-4o-mini
- **Real-time Workflow**: Live progress tracking for PDF processing
- **Multi-Modal Learning**: Practice modes, timed exams, and detailed review system

---

## Technical Stack

### Frontend
- **Framework**: Next.js 16.2.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State**: React Context + localStorage for sessions
- **Components**: Custom UI components with responsive design

### Backend
- **API**: Next.js Route Handlers
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4o-mini (cost-optimized)
- **File Storage**: Vercel Blob
- **PDF Processing**: pdf-poppler with poppler-utils

### Infrastructure
- **Deployment**: Vercel
- **Database**: PostgreSQL (production)
- **Authentication**: Simple password-based admin access
- **Environment**: Node.js with ES modules

---

## Data Models

### Core Question Schema

```typescript
export type Question = {
  id: string
  exam: string              // "Databricks", "DEA", etc.
  sourcePdf?: string        // Original PDF filename
  sourcePageStart?: number  // PDF page range
  sourcePageEnd?: number
  questionNo?: string       // Question number from source
  type: "SINGLE" | "MULTIPLE" | "TRUE_FALSE" | "TEXT"
  stem: string             // Question text
  options?: {
    key: string            // "A", "B", "C", "D", "E"
    text: string
  }[]
  answer: string[]         // Always array: ["A"] or ["A", "C"]
  explanation?: string     // Detailed explanation
  difficulty?: "EASY" | "MEDIUM" | "HARD"
  tags?: string[]          // Topic tags
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  updatedAt: string
}
```

### Processing Workflow

```typescript
export type ProcessingJob = {
  id: string
  filename: string
  fileUrl: string
  status: "uploading" | "processing" | "completed" | "failed"
  progress: number         // 0-100
  questionsExtracted: number
  error?: string
  createdAt: string
  updatedAt: string
}
```

### Exam System

```typescript
export type ExamSession = {
  id: string
  type: 'quick' | 'full'   // 20 vs 45 questions
  status: 'in_progress' | 'completed'
  questions: ExamQuestion[]
  startTime: number
  endTime?: number
  totalQuestions: number
  questionsAnswered: number
}

export type ExamResult = {
  examId: string
  type: ExamType
  score: number            // 0-100
  totalQuestions: number
  correctAnswers: number
  timeSpent: number        // minutes
  completedAt: number
  questions: Array<{
    id: string
    position: number
    selectedAnswers: string[]
    correctAnswers: string[]
    isCorrect: boolean
  }>
}
```

---

## Application Architecture

### Directory Structure

```
/app
  /admin                    # Admin management interface
    layout.tsx             # Admin authentication wrapper
    page.tsx              # Dashboard with statistics
    /upload               # PDF upload interface
      page.tsx            # Drag-drop upload with progress
    /review               # Question approval workflow
      page.tsx            # Batch review interface
    /questions            # Question bank management
      page.tsx            # Search, filter, edit questions
  /exam                    # Student exam system
    page.tsx              # Exam center with history
    /quick                # 20-question exam
      page.tsx            # Quick exam interface
    /full                 # 45-question exam
      page.tsx            # Full exam interface
    /review/[examId]      # Post-exam review
      page.tsx            # Detailed answer review
  /practice               # Practice modes
    page.tsx              # Practice mode selection
    /sequential           # Sequential practice
      page.tsx            # Question-by-question practice
    /random              # Random practice
      page.tsx            # Randomized question practice
  /api                    # Backend API routes
    /admin               # Admin-only endpoints
      /upload            # PDF upload handling
      /questions         # Question CRUD operations
      /jobs              # Processing job status
      /auth              # Admin authentication
    /exam                # Exam system APIs
      route.ts           # Generate exam question sets
      /submit            # Submit exam for scoring
    /practice            # Practice mode APIs
      route.ts           # Get practice questions
      /sequential        # Sequential question API
    /questions           # Question retrieval
      /details           # Batch question details
/components             # Reusable UI components
/hooks                  # Custom React hooks
  useExamSession.tsx    # Exam state management
/lib                    # Utilities and configurations
  db.ts                 # Prisma database client
  pdf-processor.ts      # PDF processing pipeline
/types                  # TypeScript definitions
  question.ts           # Question type definitions
  exam-session.ts       # Exam system types
/middleware.ts          # Admin authentication middleware
```

---

## Feature Implementation Status

### ✅ Completed Features

**Admin System (Phase 1-3):**
- ✅ PDF upload with drag-drop interface
- ✅ Real-time AI processing with progress tracking
- ✅ Question extraction using OpenAI GPT-4o-mini
- ✅ Batch question review and approval workflow
- ✅ Question bank management with search/filter
- ✅ Admin authentication with session storage

**Student Interface (Phase 4-5):**
- ✅ Homepage with mode selection
- ✅ Sequential practice mode (question by question)
- ✅ Random practice mode (shuffled questions)
- ✅ Immediate feedback with explanations
- ✅ Progress tracking with localStorage

**Exam System (Phase 6):**
- ✅ Quick exam (20 questions, 40 minutes)
- ✅ Full exam (45 questions, 90 minutes)
- ✅ Timer functionality with auto-submit
- ✅ Scoring system (70% pass threshold)
- ✅ Exam history with individual records
- ✅ Detailed review with answer explanations
- ✅ Grid-based question navigation
- ✅ Delete individual exam records

**Data Management:**
- ✅ PostgreSQL database with Prisma ORM
- ✅ Question status workflow (PENDING → APPROVED)
- ✅ Data migration scripts
- ✅ API endpoints for all functionality

### 🔄 Current Data Status
- **Database**: 230 questions migrated from previous format
- **Question Status**: Most questions in APPROVED status
- **Exam Types**: Supporting "Databricks" exam category
- **Question Types**: SINGLE, MULTIPLE, TRUE_FALSE implemented

---

## API Design

### Admin APIs

```typescript
// PDF Upload and Processing
POST /api/admin/upload        // Upload PDF file
GET  /api/admin/jobs          // Get processing job status
GET  /api/admin/jobs/[id]     // Get specific job details

// Question Management
GET    /api/admin/questions      // Get questions for review
PUT    /api/admin/questions/[id] // Update question
DELETE /api/admin/questions/[id] // Delete question
POST   /api/admin/questions/approve // Batch approve/reject

// Authentication
POST /api/admin/auth          // Admin login
```

### Student APIs

```typescript
// Practice Modes
GET /api/practice             // Get random practice questions
GET /api/practice/sequential  // Get sequential practice questions

// Exam System
GET  /api/exam?type=quick|full   // Generate exam question set
POST /api/exam/submit            // Submit exam for scoring
POST /api/questions/details      // Get question details by IDs
```

---

## Processing Pipeline

### PDF to Questions Workflow

1. **Upload**: Admin uploads PDF via web interface
2. **Storage**: File saved to Vercel Blob, job created in database
3. **Text Extraction**: PDF converted to text using pdf-poppler
4. **AI Processing**: OpenAI GPT-4o-mini extracts structured questions
5. **Validation**: Questions validated against schema
6. **Storage**: Questions saved with PENDING status
7. **Review**: Admin reviews and approves questions
8. **Activation**: APPROVED questions available to students

### AI Prompt Strategy

```typescript
// Example AI processing prompt
const prompt = `
Extract multiple choice questions from this text.
Return JSON array with format:
{
  "questionNo": "1",
  "type": "SINGLE", 
  "stem": "Question text...",
  "options": [{"key": "A", "text": "Option A"}],
  "answer": ["A"],
  "explanation": "Detailed explanation..."
}

Text: ${pdfText}
`
```

---

## Authentication & Security

### Admin Access
- **Method**: Simple password-based authentication
- **Storage**: Session stored in localStorage
- **Protection**: Middleware protects all `/admin/*` routes
- **Environment**: `ADMIN_PASSWORD` environment variable

### Student Access
- **Method**: No authentication required
- **Storage**: Progress stored in localStorage
- **Scope**: Read-only access to approved questions
- **Privacy**: No personal data collection

---

## State Management

### Client-Side Storage

```typescript
// Practice Session State
const practiceState = {
  mode: 'sequential' | 'random',
  currentIndex: number,
  answers: Record<string, string[]>,
  startTime: number
}

// Exam Session State
const examState = {
  examId: string,
  type: 'quick' | 'full',
  questions: ExamQuestion[],
  timeRemaining: number,
  status: 'in_progress' | 'completed'
}

// Exam History
const examHistory = {
  [examId]: ExamResult
}
```

### Data Flow

1. **Admin Flow**: Upload → Process → Review → Approve
2. **Practice Flow**: Select Mode → Answer Questions → Get Feedback
3. **Exam Flow**: Start Exam → Answer Questions → Submit → Review Results

---

## Development Guidelines

### Code Standards
- **TypeScript**: Strict typing required
- **API Routes**: RESTful design with proper error handling
- **Components**: Functional components with hooks
- **Styling**: Tailwind CSS with responsive design
- **State**: Context API for complex state, localStorage for persistence

### Testing Strategy
- **API Testing**: Manual testing with curl/Postman
- **UI Testing**: Browser testing across different screen sizes
- **Data Validation**: Schema validation on all inputs
- **Error Handling**: Graceful degradation with user feedback

### Performance Considerations
- **Question Loading**: Batch API calls for multiple questions
- **Image Optimization**: Next.js Image component
- **Caching**: Static generation where possible
- **Bundle Size**: Tree shaking and code splitting

---

## Deployment Configuration

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host:port/db"

# AI Processing
OPENAI_API_KEY="sk-..."

# File Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# Authentication
ADMIN_PASSWORD="secure-admin-password"

# Optional
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Build Process

```bash
# Install dependencies
npm install

# Database setup
npx prisma generate
npx prisma db push

# Build application
npm run build

# Start production server
npm start
```

---

## Agent Instructions

When working on this project:

### Critical Principles
1. **Always read this AGENTS.md file first** - Contains complete project context
2. **Maintain question schema integrity** - Answer must always be string array
3. **Respect admin workflow** - All questions flow through approval process
4. **Only use APPROVED questions** - Student-facing features use approved questions only
5. **Preserve localStorage patterns** - Exam/practice state managed client-side
6. **Follow TypeScript strictly** - All types defined in `/types/` directory

### Common Tasks

**Adding New Question Types:**
1. Update Question type definition
2. Modify AI processing prompt
3. Update UI components for new type
4. Test extraction and display

**API Modifications:**
1. Check existing API patterns in `/app/api/`
2. Maintain consistent error handling
3. Validate all inputs against schemas
4. Update TypeScript types if needed

**UI Changes:**
1. Follow Tailwind CSS patterns
2. Ensure responsive design
3. Test on multiple screen sizes
4. Maintain consistent styling

### Debugging Tips

- **Database Issues**: Check Prisma schema and migrations
- **AI Processing**: Review OpenAI API logs and prompts
- **State Issues**: Check localStorage in browser dev tools
- **API Errors**: Use browser network tab and server logs
- **Build Errors**: Check TypeScript errors and imports

---

## Current Status Summary

**Project Phase**: Feature Complete ✅
**Last Major Update**: Comprehensive exam system implementation
**Database Status**: 230 questions migrated and ready
**Deployment Status**: Ready for production deployment

**Recent Completions:**
- Full exam system with timing and scoring
- Detailed review interface with question navigation
- Exam history management with individual record operations
- API optimization for question availability
- Complete TypeScript coverage

**Next Potential Enhancements:**
- User authentication system
- Advanced analytics dashboard
- Question difficulty analysis
- Mobile app version
- Multi-language support

---

**Note**: This document should be updated whenever significant changes are made to the project architecture, data models, or core functionality.
