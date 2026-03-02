/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // <--- ESTO ES LO QUE GOOGLE PIDE
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
