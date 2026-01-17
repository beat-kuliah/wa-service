'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/login') {
      setIsAuthenticated(true)
      return
    }

    // Check if token exists
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/login')
      return
    }

    setIsAuthenticated(true)
  }, [pathname, router])

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (pathname === '/login' && isAuthenticated) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
