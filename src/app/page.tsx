"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Navbar from "@/components/ui/Navbar"; // Import the Navbar component
import { supabase } from "../lib/supabaseClient";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imgDesc, setImgDesc] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(60);
  const [imageCredits, setImageCredits] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"left" | "right">("right");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleHistoryClick = () => {
    router.push("/comics-history");
  };

  const saveCreditRecord = async () => {
    const now = new Date();
    const createdAt = now.toISOString();

    const { data, error } = await supabase
      .from("comics")
      .insert([{ created_at: createdAt, prompt }])
      .select();

    if (error) {
      console.error("Error saving credit record:", error);
    }
    return data?.[0]?.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageUrls([]);

    if (credits === 0 && imageCredits === 0) {
      setShowModal(true);
      return;
    }

    setLoading(true);

    try {
      const promptResponse = await fetch("/api/prompt-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const promptData = await promptResponse.json();
      if (!promptResponse.ok) throw new Error(promptData.message);

      const imageResponse = await fetch("/api/image-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: promptData.prompts }),
      });

      const imageData = await imageResponse.json();
      if (!imageResponse.ok) throw new Error(imageData.message);

      setImageUrls(imageData.imageUrls);
      setImgDesc(Object.values(promptData.img_desc));

      if (imageData.imageUrls.length === 10) {
        const recordId = await saveCreditRecord();
        if (recordId) {
          await saveImageGeneration(
            recordId,
            imageData.imageUrls,
            Object.values(promptData.img_desc)
          );
        }
      }

      if (credits > 0) {
        setCredits((prev) => prev - 6);
      } else if (imageCredits > 0) {
        const newImageCredits = imageCredits - 6;
        setImageCredits(newImageCredits);

        const { error } = await supabase
          .from("users")
          .update({ image_credits: newImageCredits })
          .eq("id", "user_id");

        if (error) {
          console.error("Error updating image credits in Supabase:", error);
        }
      }

      router.push("/generation");
    } catch (error) {
      console.error("Error generating comic:", error);
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
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const saveImageGeneration = async (
    recordId: string,
    imageUrls: string[],
    imageDescriptions: string[]
  ) => {
    const now = new Date();
    const createdAt = now.toISOString();

    const { error } = await supabase
      .from("comics")
      .update({
        screenshot_url: imageUrls,
        image_description: imageDescriptions,
        created_at: createdAt,
      })
      .eq("id", recordId);

    if (error) {
      console.error("Error saving screenshot data:", error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleBuyCredits = () => {
    router.push("/credits");
  };

  const handleNextImage = () => {
    if (currentImageIndex < imageUrls.length - 1) {
      setFlipDirection("right");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => prev + 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setFlipDirection("left");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => prev - 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  return (
    <>
      <Navbar /> {/* Integrating the Navbar component */}
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-bangers">
  <div className="w-full max-w-3xl flex flex-col items-center justify-center">
    
    {/* Add the Heading Text Here */}
    <h1 className="text-4xl font-bold text-center text-black mb-5 mt-00 ">
      Generate comics Using AI!
    </h1>

    {imageUrls.length > 0 ? (
      <div ref={imageContainerRef} className="w-full mb-8">
        <div
          className={`relative ${
            isFlipping
              ? flipDirection === "right"
                ? "animate-page-turn-right"
                : "animate-page-turn-left"
              : ""
          }`}
        >
          {/* Image rendering here */}
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 text-center rounded-b-lg">
            {imgDesc[currentImageIndex]}
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <Button
            onClick={handlePrevImage}
            disabled={currentImageIndex === 0}
            className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            onClick={handleNextImage}
            disabled={currentImageIndex === imageUrls.length - 1}
            className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      </div>
    ) : null}

    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800"
      // style={{
      //   background: "linear-gradient(to bottom, #b12b2a, #e59c26)", // Gradient from top to bottom
      // }}
    >
      <Textarea
        ref={textareaRef}
        placeholder="Enter your comic idea here..."
        value={prompt}
        onChange={handleTextareaChange}
        className="w-full min-h-[100px] resize-none border border-gray-700 rounded bg-gray-800 text-white font-sans mb-4 p-2"
        rows={3}
        style={{ fontFamily: "'Bangers', cursive" }}
      />
      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg border border-blue-500 transform transition hover:scale-105"
      >
        Generate Comic!
      </Button>
      <div className="text-gray-400 text-sm mt-2">
        Daily Credits: {credits}
        <br />
        Additional Credits: {imageCredits}
      </div>
    </form>

    <Button
      onClick={handleHistoryClick}
      className="mt-8 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full"
    >
      View History
    </Button>
  </div>
</div>


  
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
          <LoadingSpinner />
        </div>
      )}
  
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
          <div className="bg-gray-900 p-6 rounded-lg shadow-lg text-center relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-lg mb-4 text-white">
              You do not have enough credits to generate a comic. <br />
              Please recharge your credits.
            </h2>
            <Button
              onClick={handleBuyCredits}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Buy Credits
            </Button>
          </div>
        </div>
      )}
    </>
  );  }