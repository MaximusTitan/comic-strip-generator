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
    const pdf = new jsPDF();
    const imageElements = document.querySelectorAll(".pdf-image");
  
    for (let i = 0; i < imageElements.length; i++) {
      const canvas = await html2canvas(imageElements[i] as HTMLElement);
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297); // A4 size
      if (i < imageElements.length - 1) {
        pdf.addPage();
      }
    }
  
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
