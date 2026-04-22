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

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,

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
