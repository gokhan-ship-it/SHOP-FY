import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "exceljs"],
  poweredByHeader: false,
  devIndicators: false,
};

export default nextConfig;
