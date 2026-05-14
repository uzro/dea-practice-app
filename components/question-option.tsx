'use client'

import QuestionContentRenderer from './question-content-renderer'

export type DisplayOption = {
  displayKey: string
  originalKey: string
  text: string
}

type QuestionOptionProps = {
  option: DisplayOption
  isSelected: boolean
  isCorrect: boolean
  showAnswer: boolean
  optionExplanation?: string
  onChange: (key: string) => void
  disabled: boolean
  questionType: 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'TEXT'
  mode?: 'practice' | 'review'
}

export default function QuestionOption({
  option,
  isSelected,
  isCorrect,
  showAnswer,
  optionExplanation,
  onChange,
  disabled,
  questionType,
  mode = 'practice',
}: QuestionOptionProps) {
  // 复习模式：显示圆形指示符和标签
  if (mode === 'review') {
    return (
      <div
        className={`p-4 rounded-lg border-2 transition-all ${
          isCorrect
            ? 'border-green-500 bg-green-50'
            : isSelected
            ? 'border-red-500 bg-red-50'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-start space-x-3">
          <span className={`
            w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0
            ${isCorrect
              ? 'bg-green-500 text-white'
              : isSelected
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-700'
            }
          `}>
            {option.displayKey}
          </span>
          <QuestionContentRenderer
            content={option.text}
            className="flex-1 text-gray-900"
            inlineOnly={true}
          />
          {isCorrect && (
            <span className="text-green-600 font-medium ml-auto">正确答案</span>
          )}
          {isSelected && !isCorrect && (
            <span className="text-red-600 font-medium ml-auto">您的选择</span>
          )}
        </div>
      </div>
    )
  }

  // 练习/考试模式：显示复选框/单选框
  return (
    <label
      className={`flex items-start p-3 border rounded-lg transition-all ${
        showAnswer
          ? isCorrect
            ? 'border-green-500 bg-green-50'
            : isSelected
            ? 'border-red-500 bg-red-50'
            : 'border-gray-200 bg-gray-50'
          : isSelected
          ? 'border-blue-500 bg-blue-50 cursor-pointer'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
      }`}
    >
      <input
        type={questionType === 'MULTIPLE' ? 'checkbox' : 'radio'}
        name="answer"
        value={option.originalKey}
        checked={isSelected}
        onChange={() => onChange(option.originalKey)}
        className="mt-1 mr-3"
        disabled={disabled}
      />
      <div className="flex-1">
        <div className="flex items-start gap-2 text-gray-700">
          <strong>{option.displayKey}.</strong>
          <QuestionContentRenderer
            content={option.text}
            className="flex-1 text-gray-700"
            inlineOnly={true}
          />
        </div>
        {showAnswer && optionExplanation && (
          <div className="mt-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1">
            <QuestionContentRenderer
              content={optionExplanation}
              className=""
              inlineOnly={true}
            />
          </div>
        )}
      </div>
    </label>
  )
}
