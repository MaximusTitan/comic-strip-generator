// /app/api/story-generator/route.ts
import { NextResponse } from "next/server";

const prompts: string[] = []; // Define the prompts list

export async function POST(request: Request) {
  const { prompt } = await request.json(); // Removed type from destructuring

  if (!prompt) {
    return NextResponse.json({ message: "Prompt is required" }, { status: 400 });
  }

  // Initialize the messages based on whether the prompts list is empty
  let messages: { role: string; content: string }[] = prompts.length === 0 ? [
    { 
      role: "user", 
      content: `Based on the following prompt, 
      generate a prompt for an image that would describe the opening scene of the prompt: 
      ${prompt}` 
    }
  ] : [
    { 
      role: "user", 
      content: `Based on the last prompt, 
      generate a prompt for an image that would describe the scene following the last prompt: 
      ${prompts[prompts.length - 1]}`
    }
  ];

  const model = "gpt-4o"; // Update with the latest model name

  // Set base URL based on environment
  const baseUrl = process.env.NODE_ENV === 'production' 
                ? 'https://comic-strip-generator-topaz.vercel.app' 
                : 'http://localhost:3000';

  try {
    // Continue generating and adding to prompts list until it reaches 6 items
    while (prompts.length < 6) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      const data = await response.json();

      const result = data.choices?.[0]?.message?.content?.trim();
      if (!result) {
        throw new Error("Response failed. No valid response from OpenAI.");
      }

      // Append the result to the prompts list
      prompts.push(result);

      // Update the messages for the next iteration
      messages = [{ 
        role: "user", 
        content: `Based on the last prompt, 
        generate a prompt for an image that would describe the scene following the last prompt: 
        ${prompts[prompts.length - 1]}`
      }];
    }

    // Log the final prompts list
    console.log("Final prompts list:", prompts);

    // Send the entire prompts list to the image-generator
    await fetch(`${baseUrl}/api/image-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompts }), // Send the entire list
    });

    // Return the result and the prompts list
    return NextResponse.json({ result: prompts[prompts.length - 1], prompts }, { status: 200 });

  } catch (error) {
    const errorMessage = (error as Error).message;
    return NextResponse.json(
      { message: "Error generating content", error: errorMessage },
      { status: 500 }
    );
  }
}
