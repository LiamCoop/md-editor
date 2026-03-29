import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "graph.microsoft.com",
      },
    ],
  },
  serverExternalPackages: ["@automerge/automerge"],
};

export default nextConfig;
