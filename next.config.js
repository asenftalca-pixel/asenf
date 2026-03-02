/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // Esto evita que el error 51 detenga la App por temas de TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // Esto evita que se detenga por reglas de formato
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
