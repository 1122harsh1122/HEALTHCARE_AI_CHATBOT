import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CarePulse AI - Clinical Healthcare Assistant',
  description: 'Evidence-based healthcare decision support & symptom guidance powered by Kaggle open medical datasets and serverless RAG.',
  icons: {
    icon: '/favicon.ico',
  },
  authors: [{ name: 'Healthcare AI Engineering' }],
  keywords: ['healthcare chatbot', 'kaggle medical dataset', 'symptom checker', 'RAG AI', 'clinical decision support', 'vercel nextjs']
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-teal-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
