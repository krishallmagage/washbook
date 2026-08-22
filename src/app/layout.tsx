import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WashBook',
  description: 'Vehicle wash and detailing operations platform',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The app is used one-handed at a gate; a pinch-zoom that sticks is a support
  // call. Zoom stays enabled for accessibility, but the default fits the screen.
  maximumScale: 5,
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Locale is hard-coded until Slice 12 (US-11.3) introduces next-intl and the
  // [locale] segment. Recorded in CLAUDE.md under open scope questions.
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
