"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import jsPDF from "jspdf";
import Navbar from "@/components/ui/Navbar";

export default function Generation() {
    const router = useRouter();
    const [imageData, setImageData] = useState<{
        urls: string[];
        descriptions: string[];
        prompt: string;
    }>({ urls: [], descriptions: [], prompt: "" });
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [preloadedImages, setPreloadedImages] = useState<{ [key: number]: HTMLImageElement }>({});
    const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [sidePanelPage, setSidePanelPage] = useState(0);

    // Reference to the scrollable container of the side panel
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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
            try {
                const { data, error } = await supabase
                    .from("comics")
                    .select("screenshot_url, image_description, prompt")
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
    }, []);

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

    const handleSidePanelNavigation = useCallback((index: number) => {
        if (index === currentImageIndex || index < 0 || index >= imageData.urls.length) return;
        setCurrentImageIndex(index);
    }, [currentImageIndex, imageData.urls]);

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

    // Sync scroll position
    const syncScrollPosition = useCallback(() => {
        if (!scrollContainerRef.current) return;
        const imageIndex = currentImageIndex % 10; // Index relative to the current page
        const imageElement = scrollContainerRef.current.children[imageIndex] as HTMLElement;
        if (imageElement) {
            scrollContainerRef.current.scrollTo({
                top: imageElement.offsetTop - scrollContainerRef.current.offsetTop,
                behavior: "smooth",
            });
        }
    }, [currentImageIndex]);

    useEffect(() => {
        syncScrollPosition(); // Sync whenever currentImageIndex changes
    }, [currentImageIndex, syncScrollPosition]);

    const getAnimationClasses = () => {
        if (!animationDirection) return "";
        if (animationDirection === "right") {
            return isAnimating ? "animate-slide-out-left" : "animate-slide-in-right";
        } else {
            return isAnimating ? "animate-slide-out-right" : "animate-slide-in-left";
        }
    };

    return (
        <div className="relative" style={{ fontFamily: "'Bangers', cursive" }}>
            <div className="absolute top-0 left-0 w-full z-50">
                <Navbar style={{ height: "10vh", marginBottom: 0 }} />
            </div>

            <div className="flex h-screen bg-white text-black pt-[12vh]">
                <div className="flex">
                    <div className="w-full p-10 pl-40 bg-white">
                        <div
                            ref={scrollContainerRef}
                            className="w-64 bg-white p-6 overflow-y-auto"
                            style={{ paddingLeft: "0px", height: "calc(100vh - 25vh)" }}
                        >
                            {sidePanelImages.map((image, idx) => (
                                <div
                                    key={`side-panel-${idx}`}
                                    className={`mb-4 cursor-pointer transition-transform hover:scale-105 ${
                                        image.index === currentImageIndex ? "border-2 border-blue-500" : ""
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
                    <div className="w-full max-w-4xl flex items-center mb-4">
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-md p-2 pr-16"
                            placeholder="Enter your prompt here..."
                            value={imageData.prompt}
                            onChange={(e) => setImageData({ ...imageData, prompt: e.target.value })}
                        />
                        <Button variant="outline" size="icon" className="ml-2">
                            <Download className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="w-full max-w-4xl">
                        {loading ? (
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                        ) : (
                            <Card className="w-full bg-white border-gray-200 overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="relative w-full" style={{ height: "calc(100vh - 25vh)" }}>
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
                                        {currentImageIndex < imageData.urls.length - 1 && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 text-black"
                                                onClick={() => handleNavigation("right")}
                                            >
                                                <ChevronRight className="h-6 w-6" />
                                            </Button>
                                        )}
                                        {currentImageIndex > 0 && (
                                            <Button
                                                variant="outline"
                                                size="icon"
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
