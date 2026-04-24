import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const question = await prisma.question.findFirst({
    where: {
      explanation: {
        not: null
      }
    },
    take: 1
  })

  if (question) {
    console.log('Question ID:', question.id)
    console.log('Explanation raw bytes:', JSON.stringify(question.explanation))
    console.log('Explanation with escape sequences:', question.explanation)
    console.log('Has \\n:', question.explanation?.includes('\n'))
    console.log('Has \\\\n:', question.explanation?.includes('\\n'))
  } else {
    console.log('No questions found')
  }
}

main().then(() => process.exit(0))
