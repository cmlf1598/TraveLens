import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // REVIEWER_NOTE: In development, Next.js only serves its JavaScript and hot-reload endpoints to
  // localhost. Opening the app via the LAN address (e.g. http://192.168.1.23:3000) without this
  // entry renders the HTML but never hydrates it: no search, no AI plan. Dev-only; ignored by builds.
  allowedDevOrigins: ["192.168.1.*"],
  images: {
    // Unsplash requires hotlinking from its CDN; URLs carry ixid/ixlib query params.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
