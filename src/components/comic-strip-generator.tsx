'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ComicStripGenerator() {
  const [prompt, setPrompt] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle the submission logic here
    console.log('Submitted prompt:', prompt)
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value)
    adjustTextareaHeight()
  }

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [prompt])

  return (
    <div className="flex min-h-screen">
      {/* Left half */}
      <div className="w-[30%] p-4 bg-gray-100 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-8">Comic Strip Generator</h1>
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="flex flex-col space-y-2">
            <Textarea
              ref={textareaRef}
              placeholder="Enter your prompt"
              value={prompt}
              onChange={handleTextareaChange}
              className="w-full min-h-[100px] resize-none"
              rows={3}
            />
            <Button type="submit" className="w-full">
              Send
            </Button>
          </div>
        </form>
      </div>

      {/* Right half */}
      <div className="w-[70%] p-[2%] bg-white">
        <div className="grid grid-cols-2 grid-rows-3 gap-[4%] h-full">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">Panel {index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}