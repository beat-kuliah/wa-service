'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import StatsCard from '@/components/StatsCard'
import { dashboardApi, DashboardStats } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, CheckCircle2, Clock, XCircle, Users, Mail, CircleDot, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      setError(null)
      
      // Check if user is authenticated
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('admin_token')
        if (!token) {
          setError('Not authenticated. Please login first.')
          setLoading(false)
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login'
          }, 2000)
          return
        }
      }
      
      const data = await dashboardApi.getStats()
      setStats(data)
    } catch (error: any) {
      console.error('Error loading stats:', error)
      
      // Extract error message
      let errorMessage = 'Failed to load dashboard data'
      if (error?.response) {
        // Server responded with error
        const status = error.response.status
        const data = error.response.data
        
        if (status === 401) {
          errorMessage = 'Unauthorized: Please login again'
          // Clear token and redirect
          if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_token')
            setTimeout(() => {
              window.location.href = '/login'
            }, 2000)
          }
        } else if (status === 404) {
          errorMessage = 'Dashboard endpoint not found. Check if backend API is running and endpoint exists.'
        } else if (status === 500) {
          errorMessage = `Server error: ${data?.message || 'Backend API encountered an error'}`
        } else {
          errorMessage = `Error ${status}: ${data?.message || data?.error || 'Unknown error'}`
        }
      } else if (error?.request) {
        // Request made but no response
        errorMessage = 'Cannot connect to backend API. Check if API is running and NEXT_PUBLIC_API_URL is correct.'
      } else {
        // Error setting up request
        errorMessage = error?.message || 'Failed to load dashboard data'
      }
      
      setError(errorMessage)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 p-8">
          <Card className="border-destructive">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-destructive mb-2">Failed to load dashboard data</h3>
                  <p className="text-muted-foreground">{error || 'Unknown error occurred'}</p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Troubleshooting:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Check if backend API is running</li>
                    <li>Verify NEXT_PUBLIC_API_URL in .env.local</li>
                    <li>Check browser console for detailed error logs</li>
                    <li>Ensure you are logged in (check localStorage for admin_token)</li>
                    <li>Verify backend endpoint GET /api/admin/dashboard exists</li>
                  </ul>
                </div>
                <div className="pt-4">
                  <button
                    onClick={loadStats}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const totalMessages = stats.messages.pending + stats.messages.queued + stats.messages.sent + stats.messages.failed

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview dari WhatsApp Service</p>
        </div>

        {/* WhatsApp Status */}
        <Card className={cn(
          "mb-8 border-l-4",
          stats.whatsapp.connected ? "border-primary" : "border-destructive"
        )}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold">
                    WhatsApp Status
                  </h3>
                  <Badge variant={stats.whatsapp.connected ? "default" : "destructive"}>
                    {stats.whatsapp.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  State: {stats.whatsapp.state}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Messages"
            value={totalMessages}
            icon={MessageSquare}
            color="primary"
          />
          <StatsCard
            title="Sent Messages"
            value={stats.messages.sent}
            icon={CheckCircle2}
            color="green"
          />
          <StatsCard
            title="Pending Messages"
            value={stats.messages.pending}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Failed Messages"
            value={stats.messages.failed}
            icon={XCircle}
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Chats"
            value={stats.chats.total}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Unread Chats"
            value={stats.chats.unread}
            icon={Mail}
            color="yellow"
          />
          <StatsCard
            title="Active Sessions"
            value={stats.chats.active}
            icon={CircleDot}
            color="green"
          />
          <StatsCard
            title="Archived Sessions"
            value={stats.chats.archived}
            icon={Archive}
            color="blue"
          />
        </div>

        {/* Message Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Message Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Sent</span>
                  <span className="text-sm font-medium">
                    {stats.messages.sent} ({totalMessages > 0 ? Math.round((stats.messages.sent / totalMessages) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all"
                    style={{ width: `${totalMessages > 0 ? (stats.messages.sent / totalMessages) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Pending</span>
                  <span className="text-sm font-medium">
                    {stats.messages.pending} ({totalMessages > 0 ? Math.round((stats.messages.pending / totalMessages) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-yellow-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${totalMessages > 0 ? (stats.messages.pending / totalMessages) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Queued</span>
                  <span className="text-sm font-medium">
                    {stats.messages.queued} ({totalMessages > 0 ? Math.round((stats.messages.queued / totalMessages) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${totalMessages > 0 ? (stats.messages.queued / totalMessages) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Failed</span>
                  <span className="text-sm font-medium">
                    {stats.messages.failed} ({totalMessages > 0 ? Math.round((stats.messages.failed / totalMessages) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-destructive h-2.5 rounded-full transition-all"
                    style={{ width: `${totalMessages > 0 ? (stats.messages.failed / totalMessages) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
