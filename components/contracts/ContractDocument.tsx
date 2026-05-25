import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  className?: string
}

export function ContractDocument({ content, className = '' }: Props) {
  return (
    <div className={`contract-doc px-10 py-10 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900 mb-1 uppercase">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-gray-900 mt-8 mb-3 uppercase tracking-wide border-b border-gray-200 pb-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-gray-800 mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 space-y-1.5 mb-4 text-sm text-gray-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 space-y-1.5 mb-4 text-sm text-gray-700">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          hr: () => (
            <hr className="my-8 border-gray-200" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-200 px-3 py-2 text-sm text-gray-700">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 pl-4 text-gray-500 italic my-3">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-gray-100 rounded px-1.5 py-0.5 text-xs font-mono text-gray-700">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
