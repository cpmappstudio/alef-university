import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

type ServerActionBodySizeLimit = NonNullable<
  NonNullable<NextConfig["experimental"]>["serverActions"]
>["bodySizeLimit"];

const serverActionBodySizeLimit = (process.env.NEXT_SERVER_ACTIONS_BODY_LIMIT ??
  "1024mb") satisfies string;

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: serverActionBodySizeLimit as ServerActionBodySizeLimit,
    },
  },
  images: {
    domains: ["books.google.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.google.com",
        pathname: "/books/content",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
