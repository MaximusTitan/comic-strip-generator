"use client";

import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";

const ComicDisplay = () => {
  const router = useRouter();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imgDesc, setImgDesc] = useState<string[]>([]);

  // Fetch the data from the previous session (could be stored in local storage, session storage, or passed via URL/state)
  useEffect(() => {
    // Assuming the data has been passed from the previous page or stored in the session
    const storedImageUrls = JSON.parse(localStorage.getItem('imageUrls') || '[]');
    const storedImgDesc = JSON.parse(localStorage.getItem('imgDesc') || '[]');

    setImageUrls(storedImageUrls);
    setImgDesc(storedImgDesc);
  }, []);

  const handleBack = () => {
    router.push('/'); // Go back to the main page
  };

  return (
    <div className="flex min-h-screen justify-center items-center bg-black bg-opacity-50">
      <div className="flex flex-col items-center">
        {imageUrls.length > 0 ? (
          imageUrls.map((url, index) => (
            <div key={index} className="relative mb-6 w-3/4">
              <Image 
                src={url} 
                alt={`Panel ${index + 1}`} 
                layout="intrinsic"
                width={800}
                height={600}
                className="rounded"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 text-center">
                {imgDesc[index]}
              </div>
            </div>
          ))
        ) : (
          <p className="text-white text-lg">No comic strip generated yet.</p>
        )}

        <Button onClick={handleBack} className="mt-4 bg-primary text-white">
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default ComicDisplay;
