"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Head from 'next/head';
import html2canvas from 'html2canvas';

export default function Home() {
  const { userId } = useAuth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const [prompt, setPrompt] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

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
      const canvas = await html2canvas(imageContainerRef.current, {
        scale: 2,
        useCORS: true,
      });

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
        <link href="https://fonts.googleapis.com/css2?family=Bangers&display=swap" rel="stylesheet" />
      </Head>
      <div className="flex min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/images/bg3.jpg')" }}>
        {/* Left panel */}
        <div className="w-[30%] p-4 flex flex-col items-center border-r-4 border-black bg-white bg-opacity-10">
          {/* Display title at the top when images are present */}
          {imageUrls.length > 0 ? (
            <h1 className="text-3xl font-bold text-white text-center mb-4" style={{ fontFamily: 'Bangers, cursive', textShadow: '2px 2px 0 #000' }}>
              Comic Strip Generator
            </h1>
          ) : null}
          <div className="pt-[50%] w-full">
            <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-4 rounded-lg shadow-lg border-4 border-black">
              <div className="flex flex-col space-y-2">
                <Textarea
                  ref={textareaRef}
                  placeholder="Enter your comic idea here..."
                  value={prompt}
                  onChange={handleTextareaChange}
                  className="w-full min-h-[100px] resize-none border-2 border-black rounded font-sans"
                  rows={3}
                />
                <Button type="submit" className="w-full bg-primary hover:bg-primary-foreground text-white font-bold py-2 px-4 rounded-full border-2 border-black transform transition hover:scale-105">
                  Generate Comic!
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[70%] p-[2%] relative bg-white bg-opacity-10 flex flex-col items-center" style={{ height: '100vh' }}>
          {/* Center title when no images are displayed */}
          {imageUrls.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-[22%]">
              <div className="bg-black bg-opacity-40 p-5"> {/* Black rectangle with 90% transparency and padding */}
                <h1 className="text-6xl font-bold text-white text-center leading-tight" style={{ fontFamily: 'Bangers, cursive', textShadow: '2px 2px 0 #000' }}>
                  Comic Strip<br />
                  <span className="block">Generator</span>
                </h1>
              </div>
              {loading && <LoadingSpinner />}
            </div>
          )}
          <div ref={imageContainerRef} className="grid grid-cols-2 grid-rows-3 gap-[4%] h-full">
            {imageUrls.length > 0 ? (
              imageUrls.map((url, index) => (
                <div key={index} className="bg-white rounded-lg flex items-center justify-center border-4 border-black shadow-lg transform transition hover:scale-105">
                  <Image 
                    src={url} 
                    alt={`Panel ${index + 1}`} 
                    width={500} 
                    height={500} 
                    className="max-w-full max-h-full rounded"
                  />
                </div>
              ))
            ) : (
              // Placeholder panels are hidden
              <div className="hidden">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="bg-white rounded-lg flex items-center justify-center border-4 border-black shadow-lg">
                    <span className="text-gray-700 font-bold text-2xl" style={{ fontFamily: 'Bangers, cursive' }}>Panel {index + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {imageUrls.length > 0 && (
            <Button 
              onClick={handleDownload} 
              className="absolute bottom-4 right-4 bg-black text-white hover:bg-white hover:text-black border-2 border-black transform transition hover:scale-105"
            >
              Download
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
