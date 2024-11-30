import type { Metadata } from "next";
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

// Metadata for the application, including the favicon
export const metadata: Metadata = {
  title: "ComicGen",
  description: "Prompt your comics!",
  icons: {
    icon: "/comic-gen.png", // Path to your favicon in the public directory
  },
};

// Root layout component
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkClientProvider>{children}</ClerkClientProvider>
      </body>
    </html>
  );
}
