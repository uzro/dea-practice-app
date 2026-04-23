const { Client } = require('pg')
require('dotenv').config()

async function migrateData() {
  console.log('🚀 开始数据迁移...')
  console.log(`📤 从: ${process.env.DATABASE_URL_OLD?.substring(0, 50)}...`)
  console.log(`📥 到: ${process.env.DATABASE_URL?.substring(0, 50)}...`)

  // 创建数据库连接
  const oldDB = new Client({
    connectionString: process.env.DATABASE_URL_OLD
  })
  
  const newDB = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    // 连接数据库
    await oldDB.connect()
    await newDB.connect()
    console.log('✅ 数据库连接成功')

    // 1. 迁移 Exams 表
    console.log('\n📚 迁移 Exams 表...')
    const oldExamsResult = await oldDB.query('SELECT * FROM exams ORDER BY "createdAt"')
    const oldExams = oldExamsResult.rows
    console.log(`发现 ${oldExams.length} 条考试记录`)
    
    if (oldExams.length > 0) {
      for (const exam of oldExams) {
        try {
          await newDB.query(`
            INSERT INTO exams (id, name, description, year, "isActive", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING
          `, [exam.id, exam.name, exam.description, exam.year, exam.isActive, exam.createdAt, exam.updatedAt])
        } catch (error) {
          console.log(`跳过考试记录: ${exam.id} - ${error.message}`)
        }
      }
      console.log(`✅ 考试记录迁移完成`)
    }

    // 2. 迁移 ProcessingJobs 表
    console.log('\n🔄 迁移 ProcessingJobs 表...')
    const oldJobsResult = await oldDB.query('SELECT * FROM processing_jobs ORDER BY "createdAt"')
    const oldJobs = oldJobsResult.rows
    console.log(`发现 ${oldJobs.length} 条处理任务记录`)
    
    if (oldJobs.length > 0) {
      for (const job of oldJobs) {
        try {
          await newDB.query(`
            INSERT INTO processing_jobs (id, filename, "fileUrl", status, progress, "questionsExtracted", error, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING
          `, [job.id, job.filename, job.fileUrl, job.status, job.progress, job.questionsExtracted, job.error, job.createdAt, job.updatedAt])
        } catch (error) {
          console.log(`跳过处理任务记录: ${job.id} - ${error.message}`)
        }
      }
      console.log(`✅ 处理任务记录迁移完成`)
    }

    // 3. 迁移 Questions 表
    console.log('\n📝 迁移 Questions 表...')
    const oldQuestionsResult = await oldDB.query('SELECT * FROM questions ORDER BY "createdAt"')
    const oldQuestions = oldQuestionsResult.rows
    console.log(`发现 ${oldQuestions.length} 条题目记录`)
    
    if (oldQuestions.length > 0) {
      let successCount = 0
      for (const question of oldQuestions) {
        try {
          // 处理JSON字段 - 如果是对象则序列化，如果已经是字符串则保持原样
          const optionsJson = question.options ? 
            (typeof question.options === 'string' ? question.options : JSON.stringify(question.options)) : null
          const answerJson = question.answer ? 
            (typeof question.answer === 'string' ? question.answer : JSON.stringify(question.answer)) : null
          const tagsJson = question.tags ? 
            (typeof question.tags === 'string' ? question.tags : JSON.stringify(question.tags)) : null

          await newDB.query(`
            INSERT INTO questions (
              id, exam, "sourcePdf", "sourcePageStart", "sourcePageEnd", 
              "questionNo", type, stem, options, answer, explanation, 
              difficulty, tags, status, "createdAt", "updatedAt"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO NOTHING
          `, [
            question.id, question.exam, question.sourcePdf, question.sourcePageStart, question.sourcePageEnd,
            question.questionNo, question.type, question.stem, optionsJson, answerJson, question.explanation,
            question.difficulty, tagsJson, question.status, question.createdAt, question.updatedAt
          ])
          successCount++
          if (successCount % 10 === 0) {
            console.log(`已迁移 ${successCount}/${oldQuestions.length} 条题目...`)
          }
        } catch (error) {
          console.log(`跳过题目记录: ${question.id} - ${error.message}`)
        }
      }
      console.log(`✅ 题目记录迁移完成 (${successCount}/${oldQuestions.length})`)
    }

    // 验证迁移结果
    console.log('\n🔍 验证迁移结果...')
    const newExamCount = await newDB.query('SELECT COUNT(*) FROM exams')
    const newJobCount = await newDB.query('SELECT COUNT(*) FROM processing_jobs')
    const newQuestionCount = await newDB.query('SELECT COUNT(*) FROM questions')
    
    console.log(`📚 Exams: ${newExamCount.rows[0].count} 条`)
    console.log(`🔄 ProcessingJobs: ${newJobCount.rows[0].count} 条`)
    console.log(`📝 Questions: ${newQuestionCount.rows[0].count} 条`)

    console.log('\n🎉 数据迁移完成！')

  } catch (error) {
    console.error('❌ 迁移失败:', error)
    process.exit(1)
  } finally {
    await oldDB.end()
    await newDB.end()
    console.log('💾 数据库连接已关闭')
  }
}

// 运行迁移
migrateData().catch(console.error)

// 运行迁移
migrateData().catch(console.error)