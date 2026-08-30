/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @studentos/shared ships TypeScript source (no build step of its own consumed
  // here), so Next must transpile it like first-party app code.
  transpilePackages: ['@studentos/shared'],
};

module.exports = nextConfig;
