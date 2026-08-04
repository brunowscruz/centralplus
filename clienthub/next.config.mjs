/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Agent SDK spawns the Claude Code binary; keep it external to the bundle.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
};

export default nextConfig;
