import React from 'react'
import { renderToString } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

const testContent = `这是第一行
这是第二行
这是第三行`

const renderer = React.createElement(ReactMarkdown, {
  remarkPlugins: [remarkBreaks],
  children: testContent
})

const html = renderToString(renderer)
console.log('HTML Output:')
console.log(html)
console.log('\nDoes it contain <br/>?', html.includes('<br>') || html.includes('<br/>'))
