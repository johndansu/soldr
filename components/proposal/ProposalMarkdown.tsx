'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-1 text-sm font-semibold text-gray-900">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-gray-700 leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 space-y-1 list-none pl-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 space-y-1 list-none pl-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-gray-700 leading-relaxed pl-0">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-gray-200 pl-4 py-1 text-sm text-gray-600 not-italic font-normal">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 w-full">
      <table className="w-full table-fixed border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-gray-200">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-100">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr>{children}</tr>
  ),
  th: ({ children }) => (
    <th className="py-2 px-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2.5 px-3 text-sm text-gray-700 align-top break-words">{children}</td>
  ),
}

export function ProposalMarkdown({ content }: { content: string }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
