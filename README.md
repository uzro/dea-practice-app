# DEA Exam Practice App

A web application for DEA (Data Engineer Associate) exam preparation with AI-powered question management and practice modes.

## Features

- **Admin Dashboard**: Upload PDFs, extract questions with AI, review and approve content
- **Practice Modes**: Sequential and randomized question practice
- **Exam System**: Timed exams with scoring and detailed review
- **Question Bank**: Searchable database with tags and difficulty levels

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + PostgreSQL + Prisma
- **AI**: OpenAI GPT-4o-mini for PDF processing
- **Storage**: Vercel Blob for file uploads
- **Auth**: Simple password-based admin access

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your DATABASE_URL, OPENAI_API_KEY, etc.

# Run database migrations
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

```env
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
BLOB_READ_WRITE_TOKEN="vercel_blob_..."
ADMIN_PASSWORD="your-admin-password"
```

## Usage

1. **Admin**: Visit `/admin` to upload PDFs and manage questions
2. **Practice**: Use practice modes for learning with immediate feedback
3. **Exams**: Take timed exams (20 or 45 questions) with scoring
4. **Review**: Analyze exam results with detailed explanations

## Project Structure

```
app/
├── admin/          # Admin dashboard
├── exam/           # Exam system
├── practice/       # Practice modes
└── api/            # Backend APIs
```

## Deployment

Deployable on Vercel with PostgreSQL database. See [deployment guide](https://nextjs.org/docs/deployment) for details.
