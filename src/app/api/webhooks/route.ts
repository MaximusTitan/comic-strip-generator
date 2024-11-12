import { Webhook } from "svix";
import { NextRequest, NextResponse } from "next/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabaseClient";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    throw new Error("Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local");
  }

  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };

  const payload = await req.text(); // Retrieve raw text body for verification
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: WebhookEvent;

  try {
    // Verify the webhook signature and parse the payload as a WebhookEvent
    event = wh.verify(payload, svixHeaders) as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return NextResponse.json({ message: "Webhook verification failed" }, { status: 400 });
  }

  // Process the `user.created` event
  if (event.type === "user.created") {
    const { id, email_addresses } = event.data;
    const email = email_addresses[0]?.email_address || "";

    // Insert user data into Supabase
    const { error } = await supabase.from("users").insert([{ id, email, image_credits: 0 }]);

    if (error) {
      console.error("Error inserting user data into Supabase:", error);
      return NextResponse.json({ message: "Failed to insert user data into Supabase" }, { status: 500 });
    }

    console.log("User data inserted successfully:", { id, email });
    return NextResponse.json({ message: "User data inserted successfully" });
  } else {
    return NextResponse.json({ message: `Unhandled event type: ${event.type}` }, { status: 400 });
  }
}
