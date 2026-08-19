import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CarePulse AI - Clinical Healthcare Assistant',
  description: 'Clean, evidence-based healthcare decision support grounded on Kaggle clinical datasets.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-emerald-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
