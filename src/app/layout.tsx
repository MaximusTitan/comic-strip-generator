import type { Metadata } from "next"; // Removed ReactNode import
import localFont from "next/font/local";
import ClerkClientProvider from "../components/ClerkClientProvider"; // Adjust the path if needed
import "./globals.css";

// Load custom fonts
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Metadata for the application
export const metadata: Metadata = {
  title: "My Next.js App with Clerk",
  description: "A Next.js project integrated with Clerk for authentication",
};

// Root layout component
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkClientProvider>
          {children}
        </ClerkClientProvider>
      </body>
    </html>
  );
}