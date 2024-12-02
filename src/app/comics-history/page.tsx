"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs"; // Import Clerk hook
import { PostgrestResponse } from "@supabase/supabase-js";

type ComicData = {
  urls: string[];
  descriptions: string[];
  prompt: string;
};

type SupabaseComic = {
  screenshot_url: string;
  image_description: string;
  prompt: string;
  created_at: string;
};

export default function Generation() {
  const router = useRouter();
  const { userId } = useAuth(); // Get the logged-in user's ID
  const [comicsData, setComicsData] = useState<ComicData[]>([]);
  const [currentImageIndices, setCurrentImageIndices] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAllImages = async () => {
      if (!userId) return; // Ensure the user is logged in

      setLoading(true);
      try {
        const { data, error }: PostgrestResponse<SupabaseComic> = await supabase
          .from("comics")
          .select("screenshot_url, image_description, prompt, created_at")
          .eq("user_id", userId) // Filter by the logged-in user's ID
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
  }, [userId]);

  const handleFlip = (direction: "left" | "right", index: number) => {
    setCurrentImageIndices((prevIndices) => {
      const newIndices = [...prevIndices];
      if (direction === "right") {
        newIndices[index] = Math.min(newIndices[index] + 1, comicsData[index].urls.length - 1);
      } else {
        newIndices[index] = Math.max(newIndices[index] - 1, 0);
      }
      return newIndices;
    });
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-black p-4 sm:p-8">
      <div className="absolute top-10 left-0 p-4">
        <Button
          onClick={() => router.push("/")}
          className="transition-transform transform hover:scale-105"
        >
          <Image src="/comig-gen.png" alt="Comic Strip Generator" width={200} height={50} className="rounded-lg" unoptimized />
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : comicsData.length > 0 ? (
        comicsData.map((comic, comicIndex) => (
          <Card key={comicIndex} className="w-full max-w-3xl bg-black border-white-700 mb-8">
            <CardContent className="p-0">
              <h2 className="text-2xl font-bold text-white text-center py-4">{comic.prompt}</h2>
              <div className="relative w-full h-[400px] sm:h-[500px] flex justify-center items-center overflow-hidden">
                <div className="relative w-full h-full">
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
