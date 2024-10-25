"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Head from 'next/head';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabaseClient'; 

export default function Home() {
  const { userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!userId) {
      router.push("/auth/sign-in");
    }
  }, [userId, router]);

  const [prompt, setPrompt] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleHistoryClick = () => {
    router.push('/comics-history'); // Replace with the path to your comics history page
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const takeScreenshot = async () => {
    if (imageContainerRef.current) {
      const canvas = await html2canvas(imageContainerRef.current, {
        scale: 2,
        useCORS: true,
      });

      const screenshotUrl = canvas.toDataURL("image/png");

      // Save to Supabase
      await saveScreenshotData(userId, prompt, screenshotUrl); // Ensure this function is defined or imported
    }
  };

  useEffect(() => {
    if (imageUrls.length > 0) {
      takeScreenshot();
    }
  }, [imageUrls]);

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
        {/* Sidebar */}
        <div className="w-[5%] p-4 bg-black bg-opacity-50 text-white flex flex-col items-center justify-center">
          <button onClick={handleHistoryClick} className="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6 5a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>History</span>
          </button>
        </div>

        {/* Left panel */}
        <div className="w-[35%] p-4 flex flex-col items-center border-r-4 border-black bg-white bg-opacity-10">
          {imageUrls.length > 0 ? (
            <h1 className="text-3xl font-bold text-white text-center mb-4" style={{ fontFamily: 'Bangers, cursive', textShadow: '2px 2px 0 #000' }}>
              Comic Strip Generator
            </h1>
          ) : null}
          <div className="pt-[40%] w-full flex justify-center">
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
        <div className="w-[58%] p-[2%] relative bg-white bg-opacity-10 flex flex-col items-center" style={{ height: '100vh' }}>
          {imageUrls.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-[22%]">
              <div className="bg-black bg-opacity-40 p-5">
                <h1 className="text-6xl font-bold text-white text-center leading-tight" style={{ fontFamily: 'Bangers, cursive', textShadow: '2px 2px 0 #000' }}>
                  Comic Strip<br />
                  <span className="block">Generator</span>
                </h1>
              </div>
              {loading && <LoadingSpinner />}
            </div>
          )}
          <div ref={imageContainerRef} className="grid grid-cols-2 grid-rows-3 gap-[4%] h-full">
            {imageUrls.map((url, index) => (
              <div key={index} className="bg-white rounded-lg flex items-center justify-center border-4 border-black shadow-lg transform transition hover:scale-105">
                <Image 
                  src={url} 
                  alt={`Panel ${index + 1}`} 
                  width={500} 
                  height={500} 
                  className="max-w-full max-h-full rounded"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Placeholder for saveScreenshotData function
const saveScreenshotData = async (userId: string, prompt: string, screenshotUrl: string) => {
  // Implement the logic to save the screenshot data to Supabase
  // Example:
   const { error } = await supabase
     .from('comics')
     .insert([{ user_id: userId, prompt, screenshot_url: screenshotUrl }]);
   if (error) {
     console.error('Error saving screenshot data:', error);
   }
};
