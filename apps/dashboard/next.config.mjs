import { fileURLToPath } from "node:url";

const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
try {
  process.loadEnvFile(rootEnv);
} catch {
  // .env may be absent in some environments
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BOT_HANDLE: process.env.BOT_HANDLE || "",
    NEXT_PUBLIC_CHANNEL_HANDLE: process.env.CHANNEL_HANDLE || "",
    NEXT_PUBLIC_CHANNEL_TITLE: process.env.CHANNEL_TITLE || "",
  },
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/default",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
