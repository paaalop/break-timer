'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Input from '@/components/ui/Input';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 입력하세요.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(username.trim(), password);
      // IP 환경 및 프록시 쿠키 동기화를 위해 완전 새로고침 이동
      window.location.href = '/scheduler';
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패. 아이디와 비밀번호를 확인하세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          background: 'var(--color-surface)',
          padding: 36,
        }}
      >
        {/* 헤더 */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--color-primary)',
              marginBottom: 6,
            }}
          >
            코지하우스 사직점<br />직원 관리 시스템
          </h1>
          <p style={{ fontSize: 13, color: '#888' }}>관리자 계정으로 로그인하세요.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              htmlFor="login-username"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginBottom: 5,
                letterSpacing: '0.05em',
              }}
            >
              아이디
            </label>
            <Input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디 입력 (예: admin)"
              autoComplete="username"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginBottom: 5,
                letterSpacing: '0.05em',
              }}
            >
              비밀번호
            </label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p
              style={{
                fontSize: 13,
                color: '#C0392B',
                border: '1px solid #C0392B',
                padding: '8px 12px',
                borderRadius: 4,
                background: '#FDF2F1',
              }}
            >
              {error}
            </p>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            style={{
              padding: '11px 0',
              fontSize: 14,
              fontWeight: 700,
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.75 : 1,
              marginTop: 4,
            }}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 안내 */}
        <p
          style={{
            marginTop: 20,
            fontSize: 12,
            color: '#888',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Supabase에 등록된 관리자 계정으로 로그인하세요.
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 14,
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  background: 'var(--color-surface)',
  color: 'var(--color-neutral-dark)',
  outline: 'none',
  boxSizing: 'border-box',
};
