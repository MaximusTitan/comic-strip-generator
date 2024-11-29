"use client";

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
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"left" | "right">("right");

  // Preload images
  const preloadImages = (urls: string[]) => {
    return Promise.all(
      urls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve();
          })
      )
    );
  };

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

          // Preload all images and update state after loading
          await preloadImages(urls);
          setImageUrls(urls);
          setImageDescriptions(descriptions);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
        setTimeout(() => setIsFlipping(false), 300);
      }
    };

    fetchLatestImages();
  }, [userId]);

  const handleFlip = (direction: "left" | "right") => {
    setCurrentImageIndex((prev) =>
      direction === "right"
        ? Math.min(prev + 1, imageUrls.length - 1)
        : Math.max(prev - 1, 0)
    );
    setFlipDirection(direction);
    setIsFlipping(true);

    setTimeout(() => {
      setIsFlipping(false);
    }, 300);
  };

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

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-black text-white p-4">
      <div className="w-full max-w-4xl flex justify-between items-center">
        <Button
          variant="outline"
          size="icon"
          className="bg-gray-800 hover:bg-gray-700 text-white"
          onClick={() => router.push("/")}
        >
          <Home className="h-5 w-5" />
          <span className="sr-only">Home</span>
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
          <span className="sr-only">Download PDF</span>
        </Button>
      </div>

      <div className="w-full max-w-4xl flex-grow flex items-center justify-center my-4">
        {loading ? (
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        ) : imageUrls.length > 0 ? (
          <Card className="w-full h-full bg-black border-black overflow-hidden flex flex-col">
            <CardContent className="p-0 flex-grow flex flex-col">
              <div className="relative flex-grow flex justify-center items-center">
                <div
                  className={`relative w-full h-full transition-transform duration-300 ease-in-out ${
                    isFlipping
                      ? flipDirection === "right"
                        ? "animate-page-turn-right"
                        : "animate-page-turn-left"
                      : ""
                  } pdf-image`}
                >
                  <NextImage 
                    key={currentImageIndex} 
                    src={imageUrls[currentImageIndex]} 
                    alt={`Comic image ${currentImageIndex + 1}`} 
                    layout="fill" 
                    objectFit="contain" 
                    className="rounded-t m-0" 
                    unoptimized 
                    />
                </div>
                {currentImageIndex < imageUrls.length - 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-white"
                    onClick={() => handleFlip("right")}
                  >
                    <ChevronRight className="h-6 w-6" />
                    <span className="sr-only">Next image</span>
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
                    <span className="sr-only">Previous image</span>
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
          <p className="text-white text-xl animate-fade-in text-center">
            No images found.
          </p>
        )}
      </div>

      <div className="w-full max-w-4xl flex justify-center">
        <p className="text-gray-400 text-sm">
          Image {currentImageIndex + 1} of {imageUrls.length}
        </p>
      </div>
    </div>
  );
}
