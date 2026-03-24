import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["marketing-agent-os-engine"],
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
};

export default nextConfig;
