import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

type QuestionContentRendererProps = {
  content: string
  className?: string
  inlineOnly?: boolean
}

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

export default function QuestionContentRenderer({
  content,
  className,
  inlineOnly = false,
}: QuestionContentRendererProps) {
  if (inlineOnly) {
    return (
      <div className={joinClassNames('question-content-inline', className)}>
        <ReactMarkdown
          remarkPlugins={[remarkBreaks]}
          components={{
            p: ({ children }) => <span>{children}</span>,
            br: () => <br />,
            ul: ({ children }) => <span>{children}</span>,
            ol: ({ children }) => <span>{children}</span>,
            li: ({ children }) => <span>{children} </span>,
            table: ({ children }) => <span>{children}</span>,
            code: ({ children }) => <code>{children as ReactNode}</code>,
            pre: ({ children }) => <code>{children as ReactNode}</code>,
            strong: ({ children }) => <strong>{children}</strong>,
            em: ({ children }) => <em>{children}</em>,
            a: ({ children, href }) => <a href={href}>{children}</a>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <div className={joinClassNames('question-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          br: () => <br />,
          ul: ({ children }) => <ul>{children}</ul>,
          ol: ({ children }) => <ol>{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          table: ({ children }) => (
            <div className="question-content__table-wrap">
              <table>{children}</table>
            </div>
          ),
          code: ({ children, className: codeClassName }) => {
            const isBlock = Boolean(codeClassName)

            if (isBlock) {
              return <code className={codeClassName}>{children}</code>
            }

            return <code>{children as ReactNode}</code>
          },
          pre: ({ children }) => <pre>{children}</pre>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}