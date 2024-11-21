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
import { X } from "lucide-react";

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
  const [imgDesc, setImgDesc] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(18); // Default to max credits
  const [imageCredits, setImageCredits] = useState(0);
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleHistoryClick = () => {
    router.push('/comics-history');
  };

  const saveCreditRecord = async () => {
    if (!userId) return;
  
    const today = new Date().toISOString().split('T')[0];
  
    const { data, error } = await supabase
      .from('comics')
      .insert([{ user_id: userId, created_at: today, prompt }])
      .select();
  
    if (error) {
      console.error("Error saving credit record:", error);
    }
    return data?.[0]?.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (credits === 0 && imageCredits === 0) {
      setShowModal(true); // Show insufficient credits modal
      return;
    }
  
    setLoading(true);
  
    try {
      // Generate prompts
      const promptResponse = await fetch('/api/prompt-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
  
      const promptData = await promptResponse.json();
      if (!promptResponse.ok) throw new Error(promptData.message);
  
      // Generate images
      const imageResponse = await fetch('/api/image-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: promptData.prompts }),
      });
  
      const imageData = await imageResponse.json();
      if (!imageResponse.ok) throw new Error(imageData.message);
  
      setImageUrls(imageData.imageUrls);
      setImgDesc(Object.values(promptData.img_desc));
  
      // Deduct credits
      if (credits > 0) {
        setCredits((prev) => prev - 6); // Deduct daily credits
      } else if (imageCredits > 0) {
        const newImageCredits = imageCredits - 6; // Deduct 6 from imageCredits
        setImageCredits(newImageCredits);
  
        // Update imageCredits in Supabase
        const { error } = await supabase
          .from('users')
          .update({ image_credits: newImageCredits })
          .eq('id', userId);
  
        if (error) {
          console.error('Error updating image credits in Supabase:', error);
        }
      }
  
      // Save record
      const recordId = await saveCreditRecord();
      if (recordId) await takeScreenshot(recordId);
    } catch (error) {
      console.error('Error generating comic:', error);
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

  const saveScreenshotData = async (recordId: string, screenshotUrl: string) => {
    const { error } = await supabase
      .from('comics')
      .update({ screenshot_url: screenshotUrl }) // Only update screenshot_url
      .eq('id', recordId); // Update the specific record by ID

    if (error) {
      console.error('Error saving screenshot data:', error);
    }
  };

  const takeScreenshot = async (recordId: string) => {
    if (imageContainerRef.current && userId) {
      const canvas = await html2canvas(imageContainerRef.current, {
        scale: 2,
        useCORS: true,
      });

      const screenshotUrl = canvas.toDataURL("image/png");

      // Save to Supabase
      await saveScreenshotData(recordId, screenshotUrl);
    }
  };

  const calculateDailyCredits = async (userId: string): Promise<number> => {
    if (!userId) return 18; //set back to 18
  
    const today = new Date().toISOString().split('T')[0];
  
    const { count, error } = await supabase
      .from('comics')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('created_at', today);
  
    if (error) {
      console.error('Error fetching user records:', error);
      return 18; //set back to 18 // Default to max credits on error
    }
  
    // Return credit values based on the count
    const creditMapping = [18, 12, 6, 0]; //set back to 18
    return creditMapping[count??0] ?? 0;
  };
  
  useEffect(() => {
    const fetchCredits = async () => {
      if (!userId) return;
  
      try {
        // Calculate daily credits
        const dailyCredits = await calculateDailyCredits(userId);
        console.log('Daily Credits:', dailyCredits);
        setCredits(dailyCredits);
  
        // Fetch image credits from Supabase
        const { data, error } = await supabase
          .from('users')
          .select('image_credits')
          .eq('id', userId)
          .single(); // Use single() for a single record
  
        if (error) {
          console.error('Error fetching user credits:', error);
          setImageCredits(0);
        } else {
          console.log('Fetched Image Credits:', data?.image_credits);
          setImageCredits(data?.image_credits || 0); // Default to 0 if undefined
        }
      } catch (err) {
        console.error('Unexpected error in fetchCredits:', err);
        setImageCredits(0);
      }
    };
  
    fetchCredits();
  }, [userId]);  
  
  
  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt]);

  // Function to handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Function to handle redirect to credits page
  const handleBuyCredits = () => {
    router.push('/credits');
  };

  return (
    <>
      <Head>
        <title>Comic Strip Generator</title>
        <meta name="description" content="Create your own comic strips!" />
        <link href="https://fonts.googleapis.com/css2?family=Bangers&display=swap" rel="stylesheet" />
      </Head>
      <div className="flex min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/images/bg3.jpg')" }}>
        {/* Sidebar */}
        <div className="fixed h-full w-[5%] p-4 bg-black bg-opacity-50 text-white flex flex-col items-center justify-center">
          <button onClick={handleHistoryClick} className="fixed top-1/2 transform -translate-y-1/2 flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6 5a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>History</span>
          </button>
        </div>

        {/* Left panel */}
        <div className="flex-grow w-[35%] p-4 flex flex-col items-center border-r-4 border-black bg-white bg-opacity-10">
          {imageUrls.length > 0 ? (
            <h1 className="text-3xl font-bold text-white text-center mb-4" style={{ fontFamily: 'Bangers, cursive', textShadow: '2px 2px 0 #000' }}>
              Comic Strip Generator
            </h1>
          ) : null}
          <div className="pt-[40%] w-full flex justify-center mx-auto">
            <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-4 rounded-lg shadow-lg border-4 border-black ml-16">
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
                <div className="text-black font" style={{ fontSize: '16px' }}>
                  Daily Credits: {credits}
                  <br />
                  Additional Credits: {imageCredits}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[58%] p-[2%] relative bg-white bg-opacity-10 flex flex-col items-center min-h-screen">
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
              <div key={index} className="bg-white rounded-lg flex flex-col items-center justify-start border-4 border-black shadow-lg transform transition hover:scale-105 overflow-hidden">
                <Image 
                  src={url} 
                  alt={`Panel ${index + 1}`} 
                  width={500} 
                  height={500} 
                  className="w-full h-auto rounded"
                  style={{ objectFit: 'cover', objectPosition: 'top' }}
                />
                <div className="mt-2 flex items-center justify-center text-black font-bold p-2 w-full min-h-[0px]" style={{ paddingTop: '20px', paddingBottom: '20px' }}> 
                  {imgDesc[index]} {/* Display description from imgDesc */}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal for insufficient credits */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center relative">
              <button onClick={handleCloseModal} className="absolute top-2 right-2 text-gray-500 hover:text-black">
                <X className="h-6 w-6" /> {/* X icon for closing the modal */}
              </button>
              <h2 className="text-lg mb-4">You do not have enough credits to generate a comic. <br />
              Please recharge your credits.</h2>
              <Button onClick={handleBuyCredits} className="bg-primary text-white">
                Buy Credits
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}