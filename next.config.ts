import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const basePath =
  isGithubActions && process.env.NEXT_BASE_PATH && process.env.NEXT_BASE_PATH !== "/"
    ? process.env.NEXT_BASE_PATH
    : "";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath || undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
