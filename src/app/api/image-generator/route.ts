// /app/api/image-generator/route.ts
import { NextResponse } from "next/server";
import * as fal from "@fal-ai/serverless-client";

fal.config({
  credentials: process.env.FAL_KEY,
});

interface ImageResult {
  images: Array<{ url: string }>; // Adjusted to match expected structure
}

export async function POST(request: Request) {
    try {
      const { prompts } = await request.json(); // Updated to handle `prompts` as an array

      if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
        return NextResponse.json({ message: "Image prompts are required" }, { status: 400 });
      }

      // Loop through the list of prompts and generate images for each one
      const generatedImages = await Promise.all(
        prompts.map(async (prompt) => {
          try {
            const hardcodedMessage = "You're a comic strip artist. Your job is to generate a comic-styled image on the following prompt: "; // Define your hardcoded message
            const result: ImageResult = await fal.subscribe("fal-ai/flux/schnell", {
              input: { prompt: hardcodedMessage + prompt }, // Concatenate hardcoded message with the prompt
              logs: true,
              onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                  update.logs.map((log) => log.message).forEach(console.log);
                }
              },
            });

            // Make sure result contains images
            if (!result || !result.images || result.images.length === 0) {
              throw new Error("No images generated for prompt: " + prompt);
            }

            // Return the generated image URL
            return result.images[0].url;

          } catch (innerError) {
            console.error(`Error generating image for prompt "${prompt}":`, innerError);
            return null; // Handle errors gracefully by returning null for this specific prompt
          }
        })
      );

      // Filter out any failed generations (nulls) from the results
      const validImages = generatedImages.filter((url) => url !== null);

      // If no images were generated successfully, return an error
      if (validImages.length === 0) {
        return NextResponse.json({ message: "Failed to generate images for all prompts" }, { status: 500 });
      }

      // Return all successfully generated image URLs
      return NextResponse.json({ imageUrls: validImages }, { status: 200 });

    } catch (error) {
      console.error("Error generating images:", error);
      return NextResponse.json(
        { message: "Internal Server Error", error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
}
