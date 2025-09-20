import { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import './globals.css'

export const metadata = {
  title: 'Mimir - Stay Focused & Organized',
  description: 'A web-based application designed to help knowledge workers stay focused and organized.',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}