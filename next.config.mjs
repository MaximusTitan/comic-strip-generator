/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: ['fal.media'], // Add fal.media to the list of allowed domains
    },
    experimental: {
      appDir: true, // Ensure this is enabled if you're using the app directory
    },
  };
  
  export default nextConfig;
  