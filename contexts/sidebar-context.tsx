'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface SidebarContextValue {
  pinned: boolean
  togglePin: () => void
}

const SidebarContext = createContext<SidebarContextValue>({ pinned: false, togglePin: () => {} })

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinned(localStorage.getItem('sidebar-pinned') === 'true')
  }, [])

  const togglePin = useCallback(() => {
    setPinned(prev => {
      const next = !prev
      localStorage.setItem('sidebar-pinned', String(next))
      return next
    })
  }, [])

  return <SidebarContext.Provider value={{ pinned, togglePin }}>{children}</SidebarContext.Provider>
}

export const useSidebarPin = () => useContext(SidebarContext)
