/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "trademe.tmcdn.co.nz"
      },
      {
        protocol: "https",
        hostname: "www.trademe.co.nz"
      },
      {
        protocol: "https",
        hostname: "trademe-prod-cdn.global.ssl.fastly.net"
      },
      {
        protocol: "https",
        hostname: "staticcdn.co.nz"
      }
    ]
  }
};

export default nextConfig;
