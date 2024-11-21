// comic-strip-generator/src/components/ui/Component.tsx
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@clerk/nextjs";

interface Props {
  onUpdateCredits: (newCredits: number) => void;
}

interface CreditInfo {
  type: "image";
  amount: number;
}

// Define Razorpay response types
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckout {
  open: () => void;
  close: () => void;
  on: (event: string, callback: (response: RazorpayResponse) => void) => void;
  paymentId: string;
}

declare global {
  interface Window {
    Razorpay: {
      new (options: object): RazorpayCheckout;
    };
  }
}

const Component: React.FC<Props> = ({ onUpdateCredits }) => {
  const { userId } = useAuth();
  const [credits, setCredits] = useState<CreditInfo[]>([]);
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [calculatedCredits, setCalculatedCredits] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [rechargeType, setRechargeType] = useState<"image">("image");

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

  // Fetch credits on userId change
  useEffect(() => {
    const fetchCredits = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("image_credits")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching user credits:", error);
          setAvailableCredits(0);
        } else {
          setAvailableCredits(data?.image_credits || 0);
        }
      } catch (err) {
        console.error("Unexpected error in fetchCredits:", err);
        setAvailableCredits(0);
      }
    };

    fetchCredits();
  }, [userId]);

  // Calculate the credits the user will get based on the INR entered
  useEffect(() => {
    const amount = parseInt(rechargeAmount, 10);
    if (!isNaN(amount)) {
      let creditsToAdd = 0;
      let errorMessage = "";
      // Pricing structure for image credits only
      if (rechargeType === "image") {
        if (amount >= 1) { //set this to 10
            creditsToAdd = Math.floor(amount / 1) * 1; // 1 credits for every ₹1
        } else {
          creditsToAdd = 0; // Show error message if below minimum
          errorMessage = "Minimum recharge for images is ₹10";
        }
      }
      setCalculatedCredits(creditsToAdd);
      setErrorMessage(errorMessage);
    } else {
      setCalculatedCredits(0);
      setErrorMessage("");
    }
  }, [rechargeAmount, rechargeType]);

  // Initiate Razorpay payment
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
      description: `Recharge for ${calculatedCredits} image credits`,
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

  // Handle recharge and update credits
  const handleRecharge = async (paymentResponse: RazorpayResponse) => {
    if (!userEmail || calculatedCredits <= 0) return;

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Error retrieving user:", authError?.message);
      return;
    }

    const updatedCredits = credits.map((credit) =>
      credit.type === "image"
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
                {rechargeAmount && (
                  <p className="text-sm text-muted-foreground">
                    You will get {calculatedCredits} image credits
                  </p>
                )}
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
};

export default Component;
