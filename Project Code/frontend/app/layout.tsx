import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Verifiable AI Decisions - Healthcare',
  description: 'Tamper-proof, privacy-preserving proof of AI decisions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

