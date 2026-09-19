import type { NextConfig } from "next";

// Product images live on Cloudinary; the cloud name comes from CLOUDINARY_URL (cloudinary://key:secret@cloud).
const cloudName = process.env.CLOUDINARY_URL?.split("@")[1];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: cloudName
      ? [{ protocol: "https", hostname: "res.cloudinary.com", pathname: `/${cloudName}/**` }]
      : [],
  },
};

export default nextConfig;
