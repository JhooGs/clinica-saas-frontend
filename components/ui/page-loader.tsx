'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * PageLoader — estado de carregamento com identidade visual Clinitra.
 *
 * Modos:
 *   - padrão: ocupa min-h-[40vh], ideal para carregamento de página inteira
 *   - compact: padding reduzido, ideal para uso dentro de tabelas ou cards
 *
 * Uso:
 *   if (isLoading) return <PageLoader />
 *   <PageLoader compact />
 */
export function PageLoader({
  message,
  compact = false,
  className,
}: {
  message?: string
  compact?: boolean
  className?: string
}) {
  const ringSize  = compact ? 'w-12 h-12' : 'w-20 h-20'
  const logoSize  = compact ? 'w-8 h-8'   : 'w-12 h-12'
  const logoImg   = compact ? 16           : 26
  const strokeW   = compact ? 2.5          : 3
  const r         = compact ? 21           : 34
  const cx        = compact ? 24           : 40
  const viewBox   = compact ? '0 0 48 48'  : '0 0 80 80'
  const dashArray = compact ? 132          : 213.6
  const dashOffset= compact ? 100          : 160

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        compact ? 'py-8' : 'min-h-[40vh]',
        className,
      )}
    >
      <div className={cn('relative flex items-center justify-center', ringSize)}>
        {/* Anel giratório */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          viewBox={viewBox}
          fill="none"
          aria-hidden="true"
        >
          {/* Trilha (fundo do anel) */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            stroke="#04c2fb"
            strokeWidth={strokeW}
            strokeOpacity="0.15"
          />
          {/* Arco animado */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            stroke="url(#clinitra-grad)"
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
          />
          <defs>
            <linearGradient id="clinitra-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#0094c8" />
              <stop offset="60%"  stopColor="#04c2fb" />
              <stop offset="100%" stopColor="#00d5f5" />
            </linearGradient>
          </defs>
        </svg>

        {/* Logo Clinitra no centro */}
        <div
          className={cn('rounded-full flex items-center justify-center shadow-sm', logoSize)}
          style={{
            background: 'linear-gradient(135deg, #0094c8 0%, #04c2fb 60%, #00d5f5 100%)',
          }}
        >
          <Image
            src="/logo.png"
            alt="Clinitra"
            width={logoImg}
            height={logoImg}
            className="brightness-0 invert"
          />
        </div>
      </div>

      {message && (
        <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          {message}
        </p>
      )}
    </div>
  )
}
