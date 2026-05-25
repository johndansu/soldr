'use client'

import { useState, useEffect } from 'react'

function ThinkingDots() {
  return (
    <span className="flex items-center gap-0.5">
      <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
    </span>
  )
}

interface Props {
  steps: string[]
}

export function ThinkingState({ steps }: Props) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % steps.length)
        setVisible(true)
      }, 300)
    }, 1800)
    return () => clearInterval(timer)
  }, [steps.length])

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <ThinkingDots />
        <span className={`text-sm text-gray-500 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {steps[index]}
        </span>
      </div>
      <div className="space-y-2.5 animate-pulse">
        <div className="h-3.5 bg-gray-100 rounded-full w-full" />
        <div className="h-3.5 bg-gray-100 rounded-full w-5/6" />
        <div className="h-3.5 bg-gray-100 rounded-full w-4/6" />
        <div className="h-3.5 bg-gray-100 rounded-full w-full" />
        <div className="h-3.5 bg-gray-100 rounded-full w-3/4" />
        <div className="h-3.5 bg-gray-100 rounded-full w-5/6" />
      </div>
    </div>
  )
}
