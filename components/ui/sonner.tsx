'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      richColors
      closeButton
      duration={4500}
      toastOptions={{
        style: {
          fontFamily: 'var(--font-montserrat), sans-serif',
        },
        classNames: {
          toast: 'rounded-xl shadow-lg text-sm',
          title: 'font-semibold text-sm',
          description: 'text-xs mt-0.5 opacity-90',
        },
      }}
      {...props}
    />
  )
}
