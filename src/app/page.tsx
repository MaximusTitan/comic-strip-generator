"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image'; 
import { Button } from "@/components/ui/button"; 
import { Textarea } from "@/components/ui/textarea"; 
import { useAuth } from "@clerk/nextjs"; 
import { redirect } from "next/navigation"; 
import LoadingSpinner from "@/components/ui/LoadingSpinner"; 
import Head from 'next/head';
import html2canvas from 'html2canvas'; // Import html2canvas

export default function Home() {
  const { userId } = useAuth(); 

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const [prompt, setPrompt] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]); 
  const [loading, setLoading] = useState(false); 
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null); // Ref for the image container

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitted prompt:', prompt);
    setLoading(true); 

    try {
        const response = await fetch('/api/prompt-generator', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }), 
        });

        const data = await response.json();
        if (response.ok) {
            const prompts = data.prompts; 
            console.log('Response from backend:', data.result);
            console.log('Prompts:', prompts);

            const imageResponse = await fetch('/api/image-generator', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompts }), 
            });

            const imageData = await imageResponse.json();
            if (imageResponse.ok) {
                const { imageUrls } = imageData; 
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
        setLoading(false); 
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

  const handleDownload = async () => {
    if (imageContainerRef.current) {
      // Use html2canvas to capture the image container and generate a canvas
      const canvas = await html2canvas(imageContainerRef.current, {
        scale: 2, // Increase resolution for better quality
        useCORS: true, // Allow CORS images
      });

      // Convert the canvas to a PNG URL and trigger download
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = "comic-strip.png";
      link.click();
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt]);

  return (
    <>
    <Head>
        <title>Comic Strip Generator</title>
        <meta name="description" content="Create your own comic strips!" />
    </Head>
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
        <div ref={imageContainerRef} className="grid grid-cols-2 grid-rows-3 gap-[4%] h-full">
          {imageUrls.length > 0 ? (
            imageUrls.map((url, index) => (
              <div key={index} className="bg-gray-300 rounded-lg flex items-center justify-center">
                <Image 
                  src={url} 
                  alt={`Panel ${index + 1}`} 
                  width={500} 
                  height={500} 
                  className="max-w-full max-h-full"
                />
              </div>
            ))
          ) : (
            [...Array(6)].map((_, index) => (
              <div key={index} className="bg-gray-300 rounded-lg flex items-center justify-center">
                <span className="text-gray-700">Panel {index + 1}</span>
              </div>
            ))
          )}
        </div>
        {/* Add the download button */}
        {imageUrls.length > 0 && (
          <Button onClick={handleDownload} className="absolute bottom-4 right-4">
            Download as PNG
          </Button>
        )}
      </div>
    </div>
    </>
  );
}
