import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Safe-T Consultations',
  description: 'Platform for Safe-T researchers to consult with SMEs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: '#0a0a0f', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
