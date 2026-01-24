import type { Metadata } from 'next'
import './globals.css'
import AuthGuard from '@/components/AuthGuard'
import { ThemeProvider } from '@/components/ThemeProvider'

// Note: WhatsApp initialization is handled by instrumentation.ts
// which runs automatically on server startup. No need to import here
// to avoid multiple initialization attempts.

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
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthGuard>{children}</AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  )
}
