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
import "@fontsource/bangers";

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

  const handleDownloadPDF = async () => {
    if (imageUrls.length === 0) {
      console.error("No images to render into PDF");
      return;
    }
  
    const pdf = new jsPDF();
  
    const margin = 20; // Set a margin around the text
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const textWidth = pageWidth - 2 * margin; // Calculate available space for the text
  
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        // Create a new image element to load the image
        const img = new Image();
        img.src = imageUrls[i];
        
        // Wait for the image to load
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(true);
          img.onerror = (error) => reject(error);
        });
  
        // Calculate dimensions for the image to fit the PDF page
        const imgWidth = 210; // A4 page width in mm
        const imgHeight = (img.height * imgWidth) / img.width;
  
        // Add the image to the PDF
        pdf.addImage(img, "PNG", 0, 10, imgWidth, imgHeight);
  
        // Add the prompt text in the middle of the page
        const promptText = imageDescriptions[i] || prompt; // Use the description or the general prompt if no specific description is available
  
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(16); // Set a reasonable font size
        pdf.setTextColor(0, 102, 204); // Set the text color to a blue shade
  
        // Calculate the y position for the text (just below the image)
        let yPosition = 10 + imgHeight + margin;
  
        // Split the text into lines if it exceeds the width of the page
        const lines = pdf.splitTextToSize(promptText, textWidth);
        lines.forEach((line: string, index: number) => {
          pdf.text(line, margin, yPosition + (index * 10)); // Add line of text with margin and line spacing
        });
  
        // Loop through the lines and add them to the PDF
        // lines.forEach((line, index) => {
        //   pdf.text(line, margin, yPosition + (index * 10)); // Add line of text with margin and line spacing
        // });
  
        // Add a new page if it's not the last image
        if (i < imageUrls.length - 1) {
          pdf.addPage();
        }
      } catch (error) {
        console.error(`Failed to load image at index ${i}:`, error);
      }
    }
  
    // Save the PDF with all images and prompts
    pdf.save("comic-strip.pdf");
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
    <div className="flex flex-col items-center justify-between h-screen bg-white text-white p-4 font-bangers">
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
          {prompt}
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
                <p className="text-white text-center text-sm md:text-base line-clamp-2">
                  {imageDescriptions[currentImageIndex]}
                </p>
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
