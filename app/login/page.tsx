'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MessageSquare, AlertCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔐 Attempting login...', { username })
      console.log('🌐 API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api')
      
      const response = await authApi.login(username, password)
      console.log('✅ Login response:', response)
      
      if (response.success && response.data?.token) {
        localStorage.setItem('admin_token', response.data.token)
        console.log('✅ Token saved, redirecting...')
        router.push('/')
      } else {
        const errorMsg = response.message || 'Login failed'
        console.error('❌ Login failed:', errorMsg)
        setError(errorMsg)
      }
    } catch (err: any) {
      console.error('❌ Login error:', err)
      console.error('❌ Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          baseURL: err.config?.baseURL,
        }
      })
      
      let errorMessage = 'Login failed. Please check your credentials.'
      
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check if the backend API is running.'
      } else if (err.response?.status === 404) {
        errorMessage = 'Login endpoint not found. Please check API configuration.'
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.'
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] dark:from-[#0a3d35] dark:via-[#0d5a4f] dark:to-[#1ea952] p-4 relative">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-lg p-1 border border-white/20 dark:border-white/10">
          <ThemeToggle variant="default" className="text-white hover:text-white hover:bg-white/20" />
        </div>
      </div>
      
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl">WA Service</CardTitle>
            <CardDescription className="mt-2">Admin Dashboard Login</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
