import type { Metadata } from 'next'
import './globals.css'
import AuthGuard from '@/components/AuthGuard'

export const metadata: Metadata = {
  title: 'WA Service Dashboard',
  description: 'Dashboard untuk WhatsApp Service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  )
}
