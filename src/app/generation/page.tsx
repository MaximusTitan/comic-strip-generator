"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  
  const [imageData, setImageData] = useState<{
    urls: string[];
    descriptions: string[];
    prompt: string;
  }>({
    urls: [],
    descriptions: [],
    prompt: ""
  });
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preloadedImages, setPreloadedImages] = useState<{ [key: number]: HTMLImageElement }>({});
  
  // Animation states
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Preload images more efficiently
  const preloadImage = useCallback((index: number) => {
    if (index < 0 || index >= imageData.urls.length) return;

    const existingPreload = preloadedImages[index];
    if (existingPreload) return;

    const img = new Image();
    img.src = imageData.urls[index];
    
    img.onload = () => {
      setPreloadedImages(prev => ({
        ...prev,
        [index]: img
      }));
    };
  }, [imageData.urls, preloadedImages]);

  // Prefetch all images when data is loaded
  useEffect(() => {
    imageData.urls.forEach((_, index) => preloadImage(index));
  }, [imageData.urls, preloadImage]);

  // Fetch latest images
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
          } catch {
            urls = [data.screenshot_url];
            descriptions = [data.image_description];
          }

          // Ensure full URLs
          urls = urls.map((url) =>
            url.startsWith("http") ? url : `https://${url}`
          );

          setImageData({
            urls,
            descriptions,
            prompt: data.prompt
          });
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestImages();
  }, [userId]);

  // Optimized navigation handler
  const handleNavigation = useCallback((direction: "left" | "right") => {
    if (isAnimating) return;

    setIsAnimating(true);
    setAnimationDirection(direction);

    // Slight delay to allow animation to start
    setTimeout(() => {
      setCurrentImageIndex(prev => {
        const newIndex = direction === "right"
          ? Math.min(prev + 1, imageData.urls.length - 1)
          : Math.max(prev - 1, 0);
        
        // Prefetch adjacent images
        preloadImage(newIndex + (direction === "right" ? 1 : -1));
        
        return newIndex;
      });

      // Reset animation state
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationDirection(null);
      }, 300);
    }, 150);
  }, [imageData.urls, preloadImage, isAnimating]);

  // PDF Download Handler
  const handleDownloadPDF = async () => {
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

  // Determine if navigation buttons should be shown
  const showLeftNav = currentImageIndex > 0;
  const showRightNav = currentImageIndex < imageData.urls.length - 1;

  // Preloaded image rendering
  const currentImage = useMemo(() => {
    return preloadedImages[currentImageIndex] || null;
  }, [preloadedImages, currentImageIndex]);

  // Custom CSS for animations
  const getAnimationClasses = () => {
    if (!animationDirection) return "";

    if (animationDirection === 'right') {
      return isAnimating 
        ? "animate-slide-out-left" 
        : "animate-slide-in-right";
    } else {
      return isAnimating 
        ? "animate-slide-out-right" 
        : "animate-slide-in-left";
    }
  };

  return (
    <>
      {/* Add custom animation keyframes */}
      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.3s ease-out;
        }
        .animate-slide-out-left {
          animation: slideOutLeft 0.3s ease-out;
        }
        .animate-slide-out-right {
          animation: slideOutRight 0.3s ease-out;
        }
      `}</style>

      <div className="flex flex-col items-center justify-between h-screen bg-black text-white p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Logo Button */}
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

        {/* Header Section */}
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
            {imageData.prompt}
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
          ) : imageData.urls.length > 0 ? (
            <Card className="w-full h-full bg-black border-black overflow-hidden flex flex-col">
              <CardContent className="p-0 flex-grow flex flex-col">
                <div className="relative flex-grow flex justify-center items-center">
                  <div 
                    key={currentImageIndex} 
                    className={`absolute w-full h-full pdf-image ${getAnimationClasses()}`}
                  >
                    {currentImage ? (
                      <img 
                        src={currentImage.src} 
                        alt={`Comic image ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain rounded-t"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        Loading...
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  {showRightNav && (
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isAnimating}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-white"
                      onClick={() => handleNavigation("right")}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  )}
                  {showLeftNav && (
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isAnimating}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-white"
                      onClick={() => handleNavigation("left")}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                  )}
                </div>
                <div className="bg-black p-2 rounded-b">
                  <p className="text-white text-center text-sm md:text-base line-clamp-2">
                    {imageData.descriptions[currentImageIndex]}
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
            Image {currentImageIndex + 1} of {imageData.urls.length}
          </p>
        </div>
      </div>
    </>
  );
}