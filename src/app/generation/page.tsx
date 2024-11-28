"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Generation() {
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [imageDescriptions, setImageDescriptions] = useState<string[]>([])
  const [prompt, setPrompt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDirection, setFlipDirection] = useState<"left" | "right">("right")

  useEffect(() => {
    const fetchLatestImages = async () => {
      try {
        const { data, error } = await supabase
          .from("comics")
          .select("screenshot_url, image_description, prompt")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (error) {
          console.error("Error fetching images:", error)
          return
        }

        if (data) {
          let urls: string[] = []
          let descriptions: string[] = []
          try {
            urls = JSON.parse(data.screenshot_url)
            descriptions = JSON.parse(data.image_description)
            setPrompt(data.prompt)
          } catch {
            urls = [data.screenshot_url]
            descriptions = [data.image_description]
            setPrompt(data.prompt)
          }

          urls = urls.map(url => url.startsWith('http') ? url : `https://${url}`)

          setImageUrls(urls)
          setImageDescriptions(descriptions)
        }
      } catch (error) {
        console.error("Unexpected error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestImages()
  }, [])

  const handleFlip = (direction: "left" | "right") => {
    setFlipDirection(direction)
    setIsFlipping(true)
    setTimeout(() => {
      setCurrentImageIndex((prev) =>
        direction === "right" ? prev + 1 : prev - 1
      )
      setIsFlipping(false)
    }, 300)
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-black p-4 sm:p-8">
      <h1 className="text-4xl font-bold text-white mb-8 animate-fade-in">
        {prompt}
      </h1>
      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : imageUrls.length > 0 ? (
        <Card className="w-full max-w-3xl bg-black border-white-700">
          <CardContent className="p-0">
            <div className="relative w-full h-[400px] sm:h-[500px] flex justify-center items-center overflow-hidden">
              <div
                className={`relative transition-transform duration-300 ease-in-out ${
                  isFlipping
                    ? flipDirection === "right"
                      ? "animate-page-turn-right"
                      : "animate-page-turn-left"
                    : ""
                }`}
                style={{ width: "100%", height: "100%" }}
              >
                <Image
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
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => handleFlip("right")}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next image</span>
                </Button>
              )}
              {currentImageIndex > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => handleFlip("left")}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous image</span>
                </Button>
              )}
            </div>
            <div className="bg-black p-4 rounded-b -mt-8">
              <p className="text-white text-center">
                {imageDescriptions[currentImageIndex]}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-white text-xl animate-fade-in">No images found.</p>
      )}
    </div>
  )
}

