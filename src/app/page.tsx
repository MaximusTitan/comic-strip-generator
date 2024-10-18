"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button"; // Ensure this path is correct
import { Textarea } from "@/components/ui/textarea"; // Ensure this path is correct
import { useAuth } from "@clerk/nextjs"; // Import useAuth for authentication
import { redirect } from "next/navigation"; // Import redirect for navigation
import LoadingSpinner from "@/components/ui/LoadingSpinner"; // Import the loading spinner

export default function Home() {
  const { userId } = useAuth(); // Get userId from useAuth

  // Redirect to sign-in if no user is logged in
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const [prompt, setPrompt] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]); // State to store generated image URLs
  const [loading, setLoading] = useState(false); // State to manage loading spinner
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitted prompt:', prompt);
    setLoading(true); // Set loading to true when the button is clicked

    try {
        // Fetch for prompt-generator
        const response = await fetch('/api/prompt-generator', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }), 
        });

        const data = await response.json();
        if (response.ok) {
            const prompts = data.prompts; // Store the list of prompts

            console.log('Response from backend:', data.result);
            console.log('Prompts:', prompts);

            // Fetch for image-generator with the list of prompts
            const imageResponse = await fetch('/api/image-generator', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompts }), // Send the array of prompts
            });

            const imageData = await imageResponse.json();
            if (imageResponse.ok) {
                const { imageUrls } = imageData; // Assuming backend returns an array of image URLs
                setImageUrls(imageUrls);
                console.log('Image URLs:', imageUrls);
            } else {
                console.error('Error from image-generator:', imageData.message);
            }

        } else {
            console.error('Error from prompt-generator:', data.message);
        }

    } catch (error) {
        console.error('Error submitting prompt:', error);
    } finally {
        setLoading(false); // Set loading to false after the process is complete
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt]);

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
      <div className="w-[70%] p-[2%] bg-white relative">
        {loading && <LoadingSpinner />} {/* Display the loading spinner when loading */}
        <div className="grid grid-cols-2 grid-rows-3 gap-[4%] h-full">
          {imageUrls.length > 0 ? (
            imageUrls.map((url, index) => (
              <div key={index} className="bg-gray-200 rounded-lg flex items-center justify-center">
                <img src={url} alt={`Panel ${index + 1}`} className="max-w-full max-h-full" />
              </div>
            ))
          ) : (
            [...Array(6)].map((_, index) => (
              <div key={index} className="bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Panel {index + 1}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
