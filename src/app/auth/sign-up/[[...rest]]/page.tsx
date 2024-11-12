// src/app/sign-up/page.tsx

"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return <SignUp redirectUrl="/" />;
}
