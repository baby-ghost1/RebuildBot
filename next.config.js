/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The dev server and the production server write to different folders so
  // they can run side by side without corrupting each other's build.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

module.exports = nextConfig;
