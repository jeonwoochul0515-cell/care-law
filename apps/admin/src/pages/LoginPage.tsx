// 운영자 로그인 — 잉크 배경 + 명조 브랜드마크
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FaBalanceScale, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function LoginPage() {
  const navigate       = useNavigate();
  const { login }      = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않아요.');
    } finally {
      setLoading(false);
    }
  };

  const fieldCls =
    'w-full rounded-md border border-white/10 bg-white/[0.04] px-4 text-[0.95rem] text-paper placeholder:text-paper/30 outline-none transition-colors focus:border-gold focus:bg-white/[0.06]';

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 py-12">
      <div className="w-full max-w-sm">
        {/* 브랜드마크 */}
        <div className="mb-9 text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg bg-white/5">
            <FaBalanceScale className="text-xl text-gold" />
          </span>
          <p className="cl-eyebrow cl-eyebrow-gold">운영 콘솔</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-paper">케어로</h1>
          <hr className="cl-rule-gold mx-auto mt-3 w-12" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-paper/70">이메일</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@care-law.kr"
              required
              className={`${fieldCls} h-12`}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-paper/70">비밀번호</label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                className={`${fieldCls} h-12 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded text-paper/40 hover:text-paper/70"
              >
                {showPw ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-danger-soft/10 px-4 py-2.5 text-sm text-danger-soft">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cl-btn cl-btn-gold cl-btn-lg cl-btn-block mt-2 disabled:opacity-50"
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-paper/35">
          법률사무소 청송 운영자 전용
        </p>
      </div>
    </div>
  );
}
