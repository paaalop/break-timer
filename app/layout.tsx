import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import ClarityAnalytics from '@/components/analytics/ClarityAnalytics';
import './globals.css';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

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
    <html lang="ko" className={`h-full ${notoSansKr.variable}`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <ClarityAnalytics />
      </body>
    </html>
  );
}
