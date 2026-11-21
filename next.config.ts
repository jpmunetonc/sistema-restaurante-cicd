import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Tailwind CSS v4: registra el loader de Turbopack para que
  // `@import "tailwindcss"` y `@theme` se compilen en producción.
  // Sin esto el CSS se sirve sin procesar y la página pierde los estilos.
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;