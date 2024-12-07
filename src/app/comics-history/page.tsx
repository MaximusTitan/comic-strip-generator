"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import jsPDF from "jspdf";
import Navbar from "@/components/ui/Navbar"

type ComicData = {
  urls: string[];
  descriptions: string[];
  prompt: string;
};

export default function ComicsHistory() {
  const router = useRouter();
  const [comicsData, setComicsData] = useState<ComicData[]>([]);
  const [currentImageIndices, setCurrentImageIndices] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const fetchAllImages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("comics")
          .select("screenshot_url, image_description, prompt, created_at")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching images:", error);
          return;
        }

        const parsedData: ComicData[] = data!.map((comic) => {
          let urls: string[] = [];
          let descriptions: string[] = [];

          try {
            urls = JSON.parse(comic.screenshot_url);
            descriptions = JSON.parse(comic.image_description);
          } catch {
            urls = [comic.screenshot_url];
            descriptions = [comic.image_description];
          }

          urls = urls
            .map((url) => {
              try {
                const validUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
                return validUrl.href;
              } catch {
                console.warn(`Invalid URL: ${url}`);
                return null;
              }
            })
            .filter(Boolean) as string[];

          return {
            urls,
            descriptions,
            prompt: comic.prompt,
          };
        });

        setComicsData(parsedData);
        setCurrentImageIndices(new Array(parsedData.length).fill(0));
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllImages();
  }, []);

  const handleFlip = (direction: "left" | "right", index: number) => {
    if (isAnimating) return; // Prevent flipping while animating
    setIsAnimating(true);
    setAnimationDirection(direction);
    setCurrentImageIndices((prevIndices) => {
        const newIndices = [...prevIndices];
        if (direction === "right") {
            newIndices[index] = Math.min(newIndices[index] + 1, comicsData[index].urls.length - 1);
        } else {
            newIndices[index] = Math.max(newIndices[index] - 1, 0);
        }
        return newIndices;
    });
    setTimeout(() => {
        setIsAnimating(false);
        setAnimationDirection(null);
    }, 300); // Match the duration of your animation
  };

  const handleDownloadPDF = async (comic: ComicData) => {
    setIsDownloading(true); // Set downloading state to true
    const pdf = new jsPDF("landscape", "mm", [270.93, 152.4]);

    for (let i = 0; i < comic.urls.length; i++) {
      if (i > 0) {
        pdf.addPage([270.93, 152.4]);
      }

      const imgUrl = comic.urls[i];
      const description = comic.descriptions[i] || "";

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

    // Save the PDF with the prompt as the filename.
    pdf.save(`${comic.prompt.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
    setIsDownloading(false); // Reset downloading state after saving
  };

  const getAnimationClasses = () => {
    if (!animationDirection) return "";
    if (animationDirection === 'right') {
        return isAnimating ? "animate-slide-out-left" : "animate-slide-in-right";
    } else {
        return isAnimating ? "animate-slide-out-right" : "animate-slide-in-left";
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-white p-4 sm:p-8 font-banger">
      
      <div className="absolute top-0 left-0 w-full z-50">
          <Navbar style={{ height: '10vh', marginBottom: 0 }} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : comicsData.length > 0 ? (
        comicsData.map((comic, comicIndex) => (
          <Card key={comicIndex} className="w-full max-w-3xl bg-black border-white-700 mb-8 pt-10">
            <CardContent className="p-0">
              <h2 className="text-2xl font-bold text-white text-center py-4">{comic.prompt}</h2>
              <div className="relative w-full h-[400px] sm:h-[500px] flex justify-center items-center overflow-hidden">
                <div className={`relative w-full h-full ${isAnimating ? getAnimationClasses() : ''}`}>
                  <Image
                    src={comic.urls[currentImageIndices[comicIndex]]}
                    alt={`Comic image ${currentImageIndices[comicIndex] + 1}`}
                    layout="fill"
                    objectFit="contain"
                    className="rounded-t m-0"
                    unoptimized
                  />
                </div>
                {currentImageIndices[comicIndex] < comic.urls.length - 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => handleFlip("right", comicIndex)}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next image</span>
                  </Button>
                )}
                {currentImageIndices[comicIndex] > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => handleFlip("left", comicIndex)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous image</span>
                  </Button>
                )}
                {/* Download Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-2 right-2"
                  onClick={() => handleDownloadPDF(comic)}
                  disabled={isDownloading} // Disable button while downloading
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download PDF</span>
                </Button>
              </div>
              <div className="bg-black p-4 rounded-b">
                <p className="text-white text-center">
                  {comic.descriptions[currentImageIndices[comicIndex]]}
                </p>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-white text-xl animate-fade-in">No images found.</p>
      )}
    </div>
  );
}