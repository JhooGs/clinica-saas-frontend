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
  {
    key: "Content-Security-Policy",
    value: [
      // Padrão restritivo — bloqueia tudo que não for explicitamente permitido
      "default-src 'self'",
      // Next.js App Router requer 'unsafe-inline' para scripts de hidratação.
      // Nonce-based CSP é o ideal mas exige mudanças no proxy.ts — melhoria futura.
      "script-src 'self' 'unsafe-inline'",
      // Tailwind + Radix UI usam atributos style inline para animações/transforms
      "style-src 'self' 'unsafe-inline'",
      // Imagens: self, data URIs, blobs (previews), Supabase Storage
      "img-src 'self' data: blob: https://*.supabase.co",
      // Fontes: self (Poppins auto-hospedada) + Google Fonts CDN (caso use)
      "font-src 'self' https://fonts.gstatic.com",
      // Conexões: API backend + Supabase REST/Realtime + ViaCEP (busca de CEP)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co " +
        "http://localhost:8000 https://api.clinitra.com " +
        "https://viacep.com.br",
      // Bloqueia carregamento em frames (já coberto pelo X-Frame-Options mas reforça)
      "frame-ancestors 'none'",
      // Restringe base href e actions de formulário
      "base-uri 'self'",
      "form-action 'self'",
      // PWA: manifesto e service worker
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
