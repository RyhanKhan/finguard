import type { NextConfig } from "next";

// Vercel exposes VERCEL=1 during builds. Never ship the local API fallback there.
if (process.env.VERCEL === "1") {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new Error("Set NEXT_PUBLIC_API_BASE_URL to the deployed backend HTTPS origin.");
  }
  if (
    value !== value?.trim() ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local") ||
    /^127\./.test(url.hostname) ||
    url.hostname === "[::1]"
  ) {
    throw new Error("Set NEXT_PUBLIC_API_BASE_URL to the deployed backend HTTPS origin.");
  }
}

const config: NextConfig = {
  poweredByHeader: false,
};
export default config;
