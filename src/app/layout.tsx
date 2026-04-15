import type { Metadata } from 'next';
import './globals.css';
import LayoutShell from '@/components/LayoutShell';

export const metadata: Metadata = {
  title: 'Lumion — Wireless Power Through Light',
  description: 'Real-time monitoring dashboard for the Lumion infrared wireless power beaming platform. Track transmitter, receiver, and energy transfer performance.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('lumion-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
