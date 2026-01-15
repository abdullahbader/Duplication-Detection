import './globals.css'
import 'leaflet/dist/leaflet.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Photo Timestamp Extractor Pro',
  description: 'Extract, analyze, and filter EXIF metadata from your photos',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
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



