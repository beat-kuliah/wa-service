'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { chatsApi, Chat } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Chats</h1>
          <p className="text-muted-foreground mt-2">Kelola chat masuk dari WhatsApp</p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'unread', 'read'].map((status) => (
            <Button
              key={status}
              onClick={() => setFilter(status)}
              variant={filter === status ? "default" : "outline"}
              size="sm"
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {/* Chats List */}
        {loading ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading chats...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : chats.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No chats found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className={cn(
                  "border-l-4 transition-all hover:shadow-md",
                  chat.isRead ? "border-muted" : "border-primary"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{chat.phoneNumber}</span>
                        {!chat.isRead && (
                          <Badge variant="default">Unread</Badge>
                        )}
                        {chat.isTriggered && (
                          <Badge variant="secondary">Triggered</Badge>
                        )}
                      </div>
                      <p className="text-sm">{chat.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Type: {chat.messageType}</span>
                        <span>•</span>
                        <span>{new Date(chat.createdAt).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
