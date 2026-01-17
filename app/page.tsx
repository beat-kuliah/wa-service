'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import StatsCard from '@/components/StatsCard'
import { dashboardApi, DashboardStats } from '@/lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      const data = await dashboardApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Failed to load dashboard data</p>
          </div>
        </div>
      </div>
    )
  }

  const totalMessages = stats.messages.pending + stats.messages.queued + stats.messages.sent + stats.messages.failed

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview dari WhatsApp Service</p>
        </div>

        {/* WhatsApp Status */}
        <div className="mb-8">
          <div className={`p-4 rounded-lg ${
            stats.whatsapp.connected 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  WhatsApp Status: {stats.whatsapp.connected ? '✅ Connected' : '❌ Disconnected'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  State: {stats.whatsapp.state}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Messages"
            value={totalMessages}
            icon="💬"
            color="blue"
          />
          <StatsCard
            title="Sent Messages"
            value={stats.messages.sent}
            icon="✅"
            color="green"
          />
          <StatsCard
            title="Pending Messages"
            value={stats.messages.pending}
            icon="⏳"
            color="yellow"
          />
          <StatsCard
            title="Failed Messages"
            value={stats.messages.failed}
            icon="❌"
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Chats"
            value={stats.chats.total}
            icon="💭"
            color="purple"
          />
          <StatsCard
            title="Unread Chats"
            value={stats.chats.unread}
            icon="📬"
            color="yellow"
          />
          <StatsCard
            title="Active Sessions"
            value={stats.chats.active}
            icon="🟢"
            color="green"
          />
          <StatsCard
            title="Archived Sessions"
            value={stats.chats.archived}
            icon="📦"
            color="blue"
          />
        </div>

        {/* Message Status Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Message Status Distribution</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Sent</span>
                <span className="text-sm font-medium text-gray-700">
                  {stats.messages.sent} ({totalMessages > 0 ? Math.round((stats.messages.sent / totalMessages) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${totalMessages > 0 ? (stats.messages.sent / totalMessages) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Pending</span>
                <span className="text-sm font-medium text-gray-700">
                  {stats.messages.pending} ({totalMessages > 0 ? Math.round((stats.messages.pending / totalMessages) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${totalMessages > 0 ? (stats.messages.pending / totalMessages) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Queued</span>
                <span className="text-sm font-medium text-gray-700">
                  {stats.messages.queued} ({totalMessages > 0 ? Math.round((stats.messages.queued / totalMessages) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${totalMessages > 0 ? (stats.messages.queued / totalMessages) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Failed</span>
                <span className="text-sm font-medium text-gray-700">
                  {stats.messages.failed} ({totalMessages > 0 ? Math.round((stats.messages.failed / totalMessages) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${totalMessages > 0 ? (stats.messages.failed / totalMessages) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
