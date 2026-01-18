'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageSquare, MessagesSquare, FileText, Key, Smartphone, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ThemeToggle'

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/chats', label: 'Chats', icon: MessagesSquare },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/api-tokens', label: 'API Tokens', icon: Key },
  { href: '/whatsapp', label: 'WhatsApp', icon: Smartphone },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-[#075E54] dark:bg-[#0a3d35] text-white min-h-screen flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold">WA Service</h1>
        </div>
        <p className="text-white/70 text-sm">Dashboard</p>
      </div>
      
      <Separator className="bg-white/10" />
      
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <Separator className="bg-white/10" />
      
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-white/80 text-sm font-medium">Theme</span>
          <ThemeToggle />
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('admin_token')
            window.location.href = '/login'
          }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  )
}
