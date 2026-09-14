import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import ClarityAnalytics from '@/components/analytics/ClarityAnalytics';
import './globals.css';

export const metadata: Metadata = {
  title: '코지하우스 사직점 직원 관리',
  description: '코지하우스 사직점 직원 근무 및 휴게시간 관리 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <ClarityAnalytics />
      </body>
    </html>
  );
}
