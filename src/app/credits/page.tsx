"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@clerk/nextjs";

interface CreditInfo {
  type: "image";
  amount: number;
}

interface Props {
  onUpdateCredits: (newCredits: number) => void;
}

// Define the response type expected by Razorpay
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckout {
  open: () => void;
  close: () => void;
  on: (event: string, callback: Function) => void;
  paymentId: string;
}

declare global {
  interface Window {
    Razorpay: {
      new (options: object): RazorpayCheckout;
    };
  }
}

export default function Component({ onUpdateCredits }: Props) {
  const { userId } = useAuth();
  const [credits, setCredits] = useState<CreditInfo[]>([]);
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [rechargeType, setRechargeType] = useState<"image">("image");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [calculatedCredits, setCalculatedCredits] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const supabase = createClient();

  const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpayScript = () => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => console.error("Failed to load Razorpay script");
      document.body.appendChild(script);
    };

    loadRazorpayScript();
  }, []);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!userId) return;
  
      try {  
        const { data, error } = await supabase
          .from('users')
          .select('image_credits')
          .eq('id', userId)
          .single();
  
        if (error) {
          console.error('Error fetching user credits:', error);
          setAvailableCredits(0);
        } else {
          console.log('Fetched Image Credits:', data?.image_credits);
          setAvailableCredits(data?.image_credits || 0);
        }
      } catch (err) {
        console.error('Unexpected error in fetchCredits:', err);
        setAvailableCredits(0);
      }
    };
  
    fetchCredits();
  }, [userId]);

  const initiatePayment = async () => {
    if (!razorpayLoaded) {
      console.error("Razorpay SDK not loaded");
      return;
    }

    const amountInPaise = parseInt(rechargeAmount, 10) * 100; // Convert to paise for Razorpay

    if (!amountInPaise || amountInPaise <= 0) return;

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency: "INR",
      name: "Credits Recharge",
      description: `Recharge for ${calculatedCredits} ${rechargeType} credits`,
      handler: async (response: RazorpayResponse) => {
        await handleRecharge(response);
      },
      prefill: {
        email: userEmail,
      },
    };

    const rzp = new window.Razorpay(options); // Using Razorpay directly from window object
    rzp.open();
  };

  const handleRecharge = async (paymentResponse: RazorpayResponse) => {
    if (!userEmail || calculatedCredits <= 0) return;

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Error retrieving user:", authError?.message);
      return;
    }

    const updatedCredits = credits.map((credit) =>
      credit.type === rechargeType
        ? { ...credit, amount: credit.amount + calculatedCredits }
        : credit
    );
    setCredits(updatedCredits);

    const newCredits = {
      image_credits: updatedCredits.find((c) => c.type === "image")?.amount || 0,
    };

    onUpdateCredits(newCredits.image_credits);

    const { error: creditUpdateError } = await supabase
      .from("users")
      .update(newCredits)
      .eq("email", userEmail);

    if (creditUpdateError) {
      console.error("Error updating credits:", creditUpdateError.message);
      return;
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-center h-screen">
        <div className="absolute top-0 right-0 p-5">
          <h2 className="text-lg">Available Credits = {availableCredits}</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recharge Credits</CardTitle>
            <CardDescription>Add more credits to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="amount">Amount (INR)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                />
                {rechargeAmount && (errorMessage ? (
                  <p className="text-sm text-red-500">{errorMessage}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    You will get {calculatedCredits} {rechargeType} credits
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={initiatePayment}>
              <Coins className="w-4 h-4 mr-2" />
              Recharge & Pay with Razorpay
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
