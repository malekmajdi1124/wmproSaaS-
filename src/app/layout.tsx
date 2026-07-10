import type { Metadata } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'WMP Outreach Hub',
  description: 'مركز مهام التواصل الداخلي لشركة Web Marketing Pro',
}

import NextTopLoader from 'nextjs-toploader';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className={cn("font-sans", ibmPlexArabic.variable)} suppressHydrationWarning>
      <body className={`${ibmPlexArabic.className} min-h-screen bg-background text-foreground font-sans antialiased text-base selection:bg-primary/20`} suppressHydrationWarning>
        <NextTopLoader color="#FF4500" showSpinner={false} speed={200} shadow="0 0 10px #FF4500,0 0 5px #FF4500" zIndex={1600} />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
