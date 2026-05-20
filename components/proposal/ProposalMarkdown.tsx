'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 text-center text-base font-bold uppercase tracking-widest text-gray-800 border-b border-gray-200 pb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-1 font-bold text-gray-900 text-sm">
      {children}
    </h3>
  ),
}

export function ProposalMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-table:text-sm prose-td:py-2 prose-th:py-2 prose-p:text-gray-700 prose-li:text-gray-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
