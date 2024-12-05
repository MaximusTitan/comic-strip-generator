"use client"; // Ensure it's a Client Component

import { useEffect, useState } from "react";
import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface LoginProps {
  searchParams: Promise<Message>;
}

export default function Login({ searchParams }: LoginProps) {
  const [message, setMessage] = useState<Message | null>(null);

  // Use useEffect to resolve the searchParams Promise
  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const result = await searchParams;
        setMessage(result);
      } catch (err) {
        setMessage({ error: "Failed to load message" });
      }
    };
    fetchMessage();
  }, [searchParams]);  

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-white">
      <form
        className="w-full max-w-md px-8 py-12 bg-white shadow-lg rounded-lg border border-gray-100"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          await signInAction(formData);
        }}
      >
        <h1 className="text-3xl font-bold text-center text-rose-500 mb-4">
          Sign in
        </h1>
        <p className="text-sm text-center text-gray-600 mb-6">
          Don’t have an account?{" "}
          <Link href="/sign-up" className="text-rose-500 font-medium underline">
            Sign up
          </Link>
        </p>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <Label htmlFor="email" className="text-gray-700">
              Email
            </Label>
            <Input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="border-gray-300 focus:border-rose-500 focus:ring-rose-500"
              aria-label="Email"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-gray-700">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-rose-500 underline"
              >
                Forgot Password?
              </Link>
            </div>
            <Input
              type="password"
              name="password"
              placeholder="Your password"
              required
              className="border-gray-300 focus:border-rose-500 focus:ring-rose-500"
              aria-label="Password"
            />
          </div>

          <SubmitButton
            pendingText="Signing In..."
            className="bg-rose-500 hover:bg-rose-600 text-white py-3 text-lg font-medium rounded-md"
          >
            Sign in
          </SubmitButton>

          {message && <FormMessage message={message} />}

          <p className="text-center text-sm text-gray-600 mt-4">
            By signing in, you agree to our{" "}
            <Link href="/privacy-policy" className="text-rose-500 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </form>
    </div>
  );
}