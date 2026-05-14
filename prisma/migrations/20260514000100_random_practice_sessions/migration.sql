-- CreateTable
CREATE TABLE "random_practice_sessions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "random_practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "random_practice_session_questions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "random_practice_session_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "random_practice_sessions_lastAccessedAt_idx" ON "random_practice_sessions"("lastAccessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "random_practice_session_questions_sessionId_questionId_key" ON "random_practice_session_questions"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "random_practice_session_questions_sessionId_idx" ON "random_practice_session_questions"("sessionId");

-- CreateIndex
CREATE INDEX "random_practice_session_questions_questionId_idx" ON "random_practice_session_questions"("questionId");

-- CreateIndex
CREATE INDEX "random_practice_session_questions_assignedAt_idx" ON "random_practice_session_questions"("assignedAt");

-- AddForeignKey
ALTER TABLE "random_practice_session_questions" ADD CONSTRAINT "random_practice_session_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "random_practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "random_practice_session_questions" ADD CONSTRAINT "random_practice_session_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
