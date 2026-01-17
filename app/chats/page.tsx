'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { chatsApi, Chat } from '@/lib/api'

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadChats()
  }, [filter])

  const loadChats = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? { isRead: filter === 'read' } : {}
      const data = await chatsApi.getAll(params)
      setChats(data)
    } catch (error) {
      console.error('Error loading chats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Chats</h1>
          <p className="text-gray-600 mt-2">Kelola chat masuk dari WhatsApp</p>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {['all', 'unread', 'read'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Chats List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading chats...</p>
            </div>
          </div>
        ) : chats.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No chats found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  chat.isRead ? 'border-gray-300' : 'border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-semibold text-gray-900">{chat.phoneNumber}</span>
                      {!chat.isRead && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          Unread
                        </span>
                      )}
                      {chat.isTriggered && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          Triggered
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-2">{chat.message}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Type: {chat.messageType}</span>
                      <span>•</span>
                      <span>{new Date(chat.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
