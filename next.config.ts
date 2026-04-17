import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark better-sqlite3 as external so Webpack doesn't try to bundle the native module.
  // On Vercel (no native modules), the app uses Supabase instead and never loads this.
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
