import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'

export function useOnlineStatus(): boolean {
  const setIsOnline = useAppStore((s) => s.setIsOnline)
  const [isOnline, setLocalOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setLocalOnline(true)
      setIsOnline(true)
    }

    const handleOffline = () => {
      setLocalOnline(false)
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setIsOnline])

  return isOnline
}
