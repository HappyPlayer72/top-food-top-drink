import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'topfood/timișoara — Unde mănâncă timișorenii, nu turiștii',
  description:
    'Clasamentul onest al restaurantelor și barurilor din Timișoara, bazat pe votul localnicilor și detectorul de capcane turistice.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-[#3A2418] antialiased selection:bg-[#B3261E]/15 selection:text-[#B3261E]">
        {children}
      </body>
    </html>
  );
}
