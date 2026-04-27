/** @type {import('next').NextConfig} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      // Chamadas ao backend FastAPI — network-first (sempre tenta API, fallback para cache)
      urlPattern: /^https?:\/\/(localhost:8000|api\.clinitra\.com).*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      // Assets estáticos — cache-first
      urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      // Chunks JS do Next.js — network-first para evitar ChunkLoadError após novos deploys.
      // StaleWhileRevalidate serviria HTML antigo com hashes de chunks que já não existem.
      urlPattern: /\/_next\/static\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "next-static",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
  ],
});

// URL do backend em runtime (dev: localhost:8000, prod: Railway/outro)
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js App Router requer 'unsafe-inline' para hidratação.
      // accounts.google.com: Supabase OAuth com Google carrega gsi/client.
      "script-src 'self' 'unsafe-inline' https://accounts.google.com",
      // Tailwind + Radix UI usam style inline para animações/transforms
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Imagens: self, data URIs, blobs (previews), Supabase Storage, Google (avatar OAuth)
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
      // Fontes: self (next/font/google serve localmente) + Google CDN (Google Sign-In UI)
      "font-src 'self' https://fonts.gstatic.com",
      // Conexões: URL do backend (dev e prod via env), Supabase, ViaCEP
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${apiUrl} http://localhost:8000 https://viacep.com.br`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Silencia o aviso de "webpack config sem turbopack config" no dev.
  // next-pwa usa webpack internamente mas fica desativado em dev.
  // O build de produção usa --webpack explicitamente (ver package.json).
  turbopack: {},

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
