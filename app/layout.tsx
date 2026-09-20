import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'MISHH - Rede Social',
  description: 'Todo mês um destaque novo.',
  applicationName: 'MISHH',
  authors: [{ name: 'MISHH' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9640110316096383"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className="bg-black text-white antialiased">
        <Toaster 
          position="top-right" 
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