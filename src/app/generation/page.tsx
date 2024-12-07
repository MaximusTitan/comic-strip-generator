"use client"

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Download, Home, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useSession } from "@clerk/nextjs";
import Navbar from "@/components/ui/Navbar";

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
    const [preloadedImages, setPreloadedImages] = useState<{ [key: number]: HTMLImageElement }>([]);
    const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [sidePanelPage, setSidePanelPage] = useState(0);

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

    useEffect(() => {
        imageData.urls.forEach((_, index) => preloadImage(index));
    }, [imageData.urls, preloadImage]);

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

    const handleNavigation = useCallback((direction: "left" | "right") => {
        if (isAnimating) return;
        setIsAnimating(true);
        setAnimationDirection(direction);
        setTimeout(() => {
            setCurrentImageIndex(prev => {
                const newIndex = direction === "right"
                    ? Math.min(prev + 1, imageData.urls.length - 1)
                    : Math.max(prev - 1, 0);
                preloadImage(newIndex + (direction === "right" ? 1 : -1));
                return newIndex;
            });
            setTimeout(() => {
                setIsAnimating(false);
                setAnimationDirection(null);
            }, 300);
        }, 150);
    }, [imageData.urls, preloadImage, isAnimating]);

        const handleDownloadPDF = async () => {
          if (!imageData.urls.length || !imageData.descriptions.length) {
              console.error("No images or descriptions available for generating the PDF.");
              return;
          }
      
          const pdf = new jsPDF({
              orientation: "landscape",
              unit: "px",
              format: [512, 288], // PDF page dimensions (scaled down)
          });
      
          for (let i = 0; i < imageData.urls.length; i++) {
              const imageUrl = imageData.urls[i];
              const description = imageData.descriptions[i];
      
              try {
                  // Create an off-screen image element
                  const img = new Image();
                  img.crossOrigin = "anonymous"; // Handle cross-origin images
                  img.src = imageUrl;
      
                  await new Promise((resolve, reject) => {
                      img.onload = resolve;
                      img.onerror = reject;
                  });
      
                  // Render image onto canvas
                  const canvas = document.createElement("canvas");
                  canvas.width = 512; // Scale image to fit within the smaller page size
                  canvas.height = 288;
                  const ctx = canvas.getContext("2d");
      
                  if (ctx) {
                      ctx.fillStyle = "white"; // Set a white background
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
                      // Convert canvas to base64 image
                      const imgData = canvas.toDataURL("image/png");
      
                      // Add image to PDF
                      pdf.addImage(imgData, "PNG", 0, 0, 512, 288);
      
                      // Add black background for the description
                      const textBoxHeight = 30; // Reduced height for text box
                      const textBoxY = 258; // Position the text box 30px from the bottom of the page
                      pdf.setFillColor(0, 0, 0); // Black background
                      pdf.rect(0, textBoxY, 512, textBoxHeight, "F"); // Draw filled rectangle at the bottom
      
                      // Add description text over the black box
                      pdf.setFontSize(16); // Increased font size
                      pdf.setTextColor(255, 255, 255); // White text color for contrast against the black background
                      const textX = 10; // Margin from left
                      const textY = textBoxY + 20; // Center the text vertically within the box
                      const maxWidth = 492; // Ensure text stays within page bounds
                      pdf.text(description, textX, textY, { maxWidth });
                  }
      
                  // Add a new page unless it's the last image
                  if (i < imageData.urls.length - 1) {
                      pdf.addPage();
                  }
              } catch (error) {
                  console.error(`Error loading or rendering image at ${imageUrl}:`, error);
              }
          }
      
          // Generate filename from the first description
          const filename = `${imageData.descriptions[0]
              .replace(/[^a-zA-Z0-9]/g, "_")
              .substring(0, 50)}-comic-strip.pdf`;
      
          pdf.save(filename);
      };  
  
    const handleSidePanelNavigation = useCallback((index: number) => {
        if (index === currentImageIndex || index < 0 || index >= imageData.urls.length) return;
        const direction = index > currentImageIndex ? "right" : "left";
        setCurrentImageIndex(index);
        setAnimationDirection(direction);
        setIsAnimating(true);
        setTimeout(() => {
            setIsAnimating(false);
            setAnimationDirection(null);
        }, 300);
    }, [currentImageIndex, imageData.urls]);

    const showLeftNav = currentImageIndex > 0;
    const showRightNav = currentImageIndex < imageData.urls.length - 1;

    const sidePanelImages = useMemo(() => {
        const totalImages = imageData.urls.length;
        const startIndex = sidePanelPage * 10;
        const images = [];
        for (let i = 0; i < 10; i++) {
            const index = startIndex + i;
            if (index >= totalImages) break;
            images.push({
                index,
                src: imageData.urls[index],
                description: imageData.descriptions[index]
            });
        }
        return images;
    }, [imageData, sidePanelPage]);

    const currentImage = useMemo(() => {
        return preloadedImages[currentImageIndex] || null;
    }, [preloadedImages, currentImageIndex]);

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
        <div className="relative" style={{ fontFamily: "'Bangers', cursive" }}>
            <div className="absolute top-0 left-0 w-full z-50">
                <Navbar style={{ height: '10vh', marginBottom: 0 }} />
            </div>
            
            <div className="flex h-screen bg-white text-black pt-[12vh]">
            
            <div className="flex">
                  {/* Parent Component */}
                  <div className="w-full p-10 pl-40 bg-white">
                    {/* Child Component */}
                    <div 
                      className="w-64 bg-white p-6 overflow-y-auto" 
                      style={{ paddingLeft: '0px', height: 'calc(100vh - 25vh)' }}
                    >
                      {sidePanelImages.map((image, idx) => (
                        <div
                          key={`side-panel-${idx}`}
                          className={`mb-4 cursor-pointer transition-transform hover:scale-105 ${
                            image.index === currentImageIndex ? 'border-2 border-blue-500' : ''
                          }`}
                          onClick={() => handleSidePanelNavigation(image.index)}
                        >
                          <img
                            src={image.src}
                            alt={`Side panel image ${image.index + 1}`}
                            className="w-full h-40 object-cover rounded"
                          />
                          <p className="text-xs mt-2 text-center line-clamp-2 text-gray-600">
                            {image.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center flex-grow bg-white text-black pr-20">
                    <div className="w-full max-w-4xl flex items-center" style={{ marginBottom: 10 }}>
                        <div className="flex-grow relative">
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded-md p-2 pr-16"
                                placeholder="Enter your prompt here..."
                                value={imageData.prompt}
                                onChange={(e) => setImageData({ ...imageData, prompt: e.target.value })}
                            />
                            <button
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-9 bg-transparent border-none cursor-pointer"
                                onClick={() => {/* Add your send functionality here */}}
                            >
                                <Send className="h-5 w-5 text-black" />
                            </button>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input shadow-sm hover:text-accent-foreground h-9 w-9 bg-white hover:bg-gray-300 text-black"
                            onClick={handleDownloadPDF}
                        >
                            <Download className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="w-full max-w-4xl flex items-center justify-center">
                        {loading ? (
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                        ) : imageData.urls.length > 0 ? (
                            <Card className="w-full bg-white border-gray-200 overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="relative w-full" style={{ height: 'calc(100vh - 25vh)' }}>
                                        <div
                                            key={currentImageIndex}
                                            className={`w-full h-full pdf-image ${getAnimationClasses()}`}
                                        >
                                            {currentImage ? (
                                                <img
                                                    src={currentImage.src}
                                                    alt={`Comic image ${currentImageIndex + 1}`}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    Loading...
                                                </div>
                                            )}
                                        </div>
                                        {showRightNav && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                disabled={isAnimating}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 text-black"
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
                                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 text-black"
                                                onClick={() => handleNavigation("left")}
                                            >
                                                <ChevronLeft className="h-6 w-6" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="bg-white py-1">
                                        <p className="text-black text-center text-sm md:text-base line-clamp-2">
                                            {imageData.descriptions[currentImageIndex]}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <p className="text-black text-xl text-center">No images found.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

