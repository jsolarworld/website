import type { NextConfig } from "next";

// Product images live on Cloudinary; the cloud name comes from CLOUDINARY_URL (cloudinary://key:secret@cloud).
const cloudName = process.env.CLOUDINARY_URL?.split("@")[1];

const nextConfig: NextConfig = {
  // Lets a second dev/build run beside the first without sharing a cache: NEXT_DIST_DIR=.next-alt pnpm dev -p 3001
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    remotePatterns: cloudName
      ? [{ protocol: "https", hostname: "res.cloudinary.com", pathname: `/${cloudName}/**` }]
      : [],
  },
};

export default nextConfig;
