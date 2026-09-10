'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

const NAV_TABS = [
  { label: '직원 관리', href: '/employees' },
  { label: '주간 스케줄러', href: '/scheduler' },
  { label: '휴게 자동 배치', href: '/auto-break' },
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
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* 1층: 앱 타이틀 & 우측 상단 연한 텍스트 로그아웃 */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 36,
          }}
        >
          {/* 앱 타이틀 (크기 축소: 15px -> 13px) */}
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--color-primary)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            레스토랑 스케줄러
          </span>

          {/* 우측 상단 연한 글씨 로그아웃 (박스 제거) */}
          <button
            onClick={handleSignOut}
            style={{
              padding: '2px 4px',
              fontSize: 11,
              fontWeight: 400,
              border: 'none',
              background: 'transparent',
              color: '#999999',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#555555')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#999999')}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 2층: 제목 밑 브라운색 메뉴바 */}
      <div
        style={{
          background: 'var(--color-primary)',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            height: 38,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <nav
            style={{
              display: 'flex',
              gap: 8,
              flex: 1,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {NAV_TABS.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={{
                    padding: '0 12px',
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.72)',
                    borderBottom: isActive ? '3px solid #FFFFFF' : '3px solid transparent',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
