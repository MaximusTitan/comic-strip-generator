"use client"

import { useEffect, useState } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Download, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useSession } from "@clerk/nextjs";

export default function Generation() {
  const { isSignedIn, session } = useSession();
  const userId = isSignedIn ? session?.user?.id : null;
  const router = useRouter();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageDescriptions, setImageDescriptions] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [preloadedNextIndex, setPreloadedNextIndex] = useState(1);
  const [animate, setAnimate] = useState(false); // New state for animation toggle
  const [isDownloading, setIsDownloading] = useState(false); // New state for download loading

  // Preload image function (no changes)
  const preloadImage = (index: number) => {
    if (index >= 0 && index < imageUrls.length) {
      const img = new Image();
      img.src = imageUrls[index];
    }
  };

  useEffect(() => {
    preloadImage(preloadedNextIndex);
  }, [preloadedNextIndex, imageUrls]);

  useEffect(() => {
    const fetchLatestImages = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("comics")
          .select("screenshot_url, image_description, prompt")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error("Error fetching images:", error);
          return;
        }

        if (data) {
          let urls: string[] = [];
          let descriptions: string[] = [];

          try {
            urls = JSON.parse(data.screenshot_url);
            descriptions = JSON.parse(data.image_description);
            setPrompt(data.prompt);
          } catch {
            urls = [data.screenshot_url];
            descriptions = [data.image_description];
            setPrompt(data.prompt);
          }

          urls = urls.map((url) =>
            url.startsWith("http") ? url : `https://${url}`
          );

          setImageUrls(urls);
          setImageDescriptions(descriptions);
          preloadImage(0);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestImages();
  }, [userId]);

  const handleDownloadPDF: () => Promise<void> = async () => {
    setIsDownloading(true); // Set downloading state to true
    if (!prompt) {
      console.error("Prompt is empty or not available.");
      return;
    }
  
    // Sanitize the prompt to create a valid filename.
    const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9_-]/g, "_");
  
    // PDF size matching 16:9 ratio, 1024x576 pixels converted to mm (270.93 x 152.4 mm).
    const pdf = new jsPDF("landscape", "mm", [270.93, 152.4]);
  
    for (let i = 0; i < imageUrls.length; i++) {
      if (i > 0) {
        pdf.addPage([270.93, 152.4]);
      }
  
      const imgUrl = imageUrls[i];
      const description = imageDescriptions[i] || "";
  
      // Add the image (full dimensions).
      pdf.addImage(imgUrl, "PNG", 0, 0, 270.93, 152.4);
  
      // Add a semi-transparent black rectangle at the bottom.
      pdf.setFillColor(0, 0, 0); // Black color.
      pdf.setDrawColor(0, 0, 0); // Black color for borders as well.
      pdf.rect(0, 132.4, 270.93, 20, "F");
  
      // Set transparency for the rectangle by adjusting fill color alpha.
      pdf.setFillColor(0, 0, 0, 128); // Set alpha to 128 (50% transparency)
  
      // Add white text over the rectangle.
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255); // White text.
      pdf.text(description, 10, 145, { maxWidth: 250 }); // Ensure text wraps.
    }
  
    // Save the PDF with the sanitized prompt as the filename.
    pdf.save(`${sanitizedPrompt}.pdf`);
    setIsDownloading(false); // Reset downloading state after saving
  }; 

  const handleFlip = (direction: "left" | "right") => {
    setAnimate(true); // Trigger animation

    setTimeout(() => {
      setCurrentImageIndex((prev) => {
        const newIndex =
          direction === "right"
            ? Math.min(prev + 1, imageUrls.length - 1)
            : Math.max(prev - 1, 0);

        setPreloadedNextIndex(
          direction === "right" ? newIndex + 1 : newIndex - 1
        );

        return newIndex;
      });
      setAnimate(false); // Reset animation state after transition
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-black text-white p-4">
      <div className="absolute top-10 left-0 p-4">
        <Button
          onClick={() => router.push("/")}
          className="transition-transform transform hover:scale-105"
        >
          <NextImage 
            src="/comig-gen.png" 
            alt="Comic Strip Generator" 
            width={200} 
            height={50} 
            className="rounded-lg" 
            unoptimized
          />
        </Button>
      </div>
      {/* Home & Download button */}
      <div className="w-full max-w-4xl flex justify-between items-center">
        <Button
          variant="outline"
          size="icon"
          className="bg-gray-800 hover:bg-gray-700 text-white"
          onClick={() => router.push("/")}
        >
          <Home className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold text-center flex-grow truncate px-2">
          {imageDescriptions[0]}
        </h1>
        <Button
          variant="outline"
          size="icon"
          className="bg-gray-800 hover:bg-gray-700 text-white"
          onClick={handleDownloadPDF}
        >
          <Download className="h-5 w-5" />
        </Button>
      </div>

      {/* Image Section */}
      <div className="w-full max-w-4xl flex-grow flex items-center justify-center my-4">
        {loading ? (
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        ) : isDownloading ? ( // Check if downloading
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        ) : imageUrls.length > 0 ? (
          <Card className="w-full h-full bg-black border-black overflow-hidden flex flex-col">
            <CardContent className="p-0 flex-grow flex flex-col">
              <div
                className={`relative flex-grow flex justify-center items-center ${
                  animate ? "fade-in" : ""
                }`}
              >
                <div className="relative w-full h-full pdf-image">
                  <NextImage
                    src={imageUrls[currentImageIndex]}
                    alt={`Comic image ${currentImageIndex + 1}`}
                    layout="fill"
                    objectFit="contain"
                    priority
                    className="rounded-t m-0"
                    unoptimized
                  />
                </div>

                {/* Navigation Buttons */}
                {currentImageIndex < imageUrls.length - 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-white"
                    onClick={() => handleFlip("right")}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}
                {currentImageIndex > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-white"
                    onClick={() => handleFlip("left")}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
              </div>
              <div className="bg-black p-2 rounded-b">
                {currentImageIndex > 0 ? ( // Show description for all images except the first one
                  <p className="text-white text-center text-sm md:text-base line-clamp-2">
                    {imageDescriptions[currentImageIndex]}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-white text-xl text-center">No images found.</p>
        )}
      </div>

      {/* Image Counter */}
      <div className="w-full max-w-4xl flex justify-center">
        <p className="text-gray-400 text-sm">
          Image {currentImageIndex + 1} of {imageUrls.length}
        </p>
      </div>
    </div>
  );
}
