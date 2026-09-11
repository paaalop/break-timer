'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

const NAV_TABS = [
  { label: '직원 관리', href: '/employees' },
  { label: '주간 근무표', href: '/scheduler' },
  { label: '휴게 배치', href: '/auto-break' },
] as const;

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <>
      {/* 우측 상단 단순 텍스트 로그아웃 (페이지 최대 폭 및 좌우 여백과 일치) */}
      <div
        className="max-w-[1400px] mx-auto px-5 sm:px-8 md:px-10 relative w-full pointer-events-none"
        style={{ height: 0, overflow: 'visible' }}
      >
        <div
          className="absolute top-3 right-5 sm:right-8 md:right-10 pointer-events-auto"
          style={{ zIndex: 50 }}
        >
          <button
            onClick={handleSignOut}
            title="로그아웃"
            style={{
              padding: 0,
              fontSize: 12,
              fontWeight: 400,
              border: 'none',
              background: 'transparent',
              color: '#888888',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.02em',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#222222';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#888888';
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 하단 중앙 정렬 내비게이션 바 */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: 'var(--color-primary)',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            height: 48,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            width: '100%',
          }}
        >
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                  borderTop: isActive ? '3px solid #FFFFFF' : '3px solid transparent',
                  borderBottom: '3px solid transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                  letterSpacing: '-0.02em',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

