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
  ul: ({ children }) => (
    <ul className="my-2 space-y-1 list-none pl-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 space-y-1 list-none pl-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-gray-700 pl-0">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-gray-900 pl-3 bg-gray-50 py-2 rounded-r text-sm text-gray-800 not-italic font-normal">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 w-full">
      <table className="w-full table-fixed border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b-2 border-gray-900">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-100">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-gray-50">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2.5 px-3 text-gray-700 align-top break-words">{children}</td>
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
