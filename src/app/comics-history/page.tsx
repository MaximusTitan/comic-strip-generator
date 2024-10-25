"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import jsPDF from 'jspdf';

interface Comic {
  id: number;
  user_id: string;
  prompt: string;
  screenshot_url: string;
  created_at: string;
}

export default function ComicsHistory() {
  const { userId } = useAuth();
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComics = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("comics")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          setError("Failed to load comics history.");
          console.error("Error fetching comics:", error);
        } else {
          setComics(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchComics();
  }, [userId]);


  const downloadComicAsPDF = (screenshotUrl: string) => {
    const pdf = new jsPDF();
    pdf.addImage(screenshotUrl, 'JPEG', 10, 10, 190, 0); // Adjust dimensions as needed
    pdf.save('comic.pdf');
  };

  return (
    <div className="min-h-screen p-6 bg-cover bg-center" style={{ backgroundImage: "url('/images/bg1.jpg')" }}>
      <h1 className="text-4xl font-bold text-center mb-8 text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Comics History</h1>
      <div className="max-w-4xl mx-auto">
        {comics.length === 0 ? (
          <p className="text-center text-white text-xl" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>No comics found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comics.map((comic) => (
              <div key={comic.id} className="bg-white rounded-lg shadow-lg border overflow-hidden flex flex-col">
                <div className="p-4 bg-primary text-white">
                  <h2 className="text-lg font-bold truncate text-center">{comic.prompt}</h2>
                </div>
                <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                  {comic.screenshot_url && (
                    <Image
                      src={comic.screenshot_url}
                      alt="Comic screenshot"
                      layout="fill"
                      objectFit="cover"
                    />
                  )}
                </div>
                <div className="p-4 bg-gray-100 flex justify-between items-center">
                  <p className="text-sm text-gray-600">Created at: {new Date(comic.created_at).toLocaleString()}</p>
                  <button 
                    className="bg-black text-white px-4 py-2 rounded hover:bg-white hover:text-black transition-colors duration-300" 
                    onClick={() => downloadComicAsPDF(comic.screenshot_url)}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
