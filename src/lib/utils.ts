import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function encodedRedirect(status: string, path: string, message: string) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("status", status);
  url.searchParams.set("message", message);
  return url.toString();
}
