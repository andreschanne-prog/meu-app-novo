import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'MISHH - Rede Social',
  description: 'A rede social que conecta o mundo. Compartilhe fotos, stories e converse.',
  applicationName: 'MISHH',
  authors: [{ name: 'MISHH' }],
  // Opcional: coloca aqui seu ID do AdSense pra verificação do Google
  other: {
    'google-adsense-account': process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || '',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT

  return (
    <html lang="pt-BR">
      <head>
        {/* AdSense só carrega se tiver o ID no .env */}
        {adsenseClient && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        {/* AdMob para PWA / WebView - deixa preparado */}
        <Script id="admob-config" strategy="afterInteractive">
          {`
            window.admobOptions = {
              publisherId: "${adsenseClient || ''}",
              bannerAdUnit: "${process.env.NEXT_PUBLIC_ADMOB_BANNER_ID || ''}"
            };
          `}
        </Script>
      </head>
      <body>
        {/* Toaster global */}
        <Toaster 
          position="top-right" 
          reverseOrder={false}
          toastOptions={{
            style: {
              background: '#262626',
              color: '#fff',
              fontSize: '13px',
              borderRadius: '9999px',
            }
          }}
        />
        {children}
      </body>
    </html>
  )
}