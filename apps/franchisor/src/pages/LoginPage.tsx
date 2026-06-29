// 가맹본사 콘솔 로그인 화면
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
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* 브랜드 */}
        <div className="text-center mb-8">
          <span className="inline-flex w-12 h-12 rounded-xl bg-white/10 items-center justify-center mb-4">
            <FaBalanceScale className="text-gold text-xl" aria-hidden />
          </span>
          <p className="cl-eyebrow cl-eyebrow-gold mb-1.5">가맹본사 콘솔</p>
          <h1 className="cl-display text-paper text-2xl">케어로</h1>
        </div>

        {/* 폼 카드 */}
        <div className="cl-card p-6 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="cl-label">이메일</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@brand.co.kr"
                required
                className="cl-input"
              />
            </div>
            <div>
              <label htmlFor="password" className="cl-label">비밀번호</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="cl-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md text-ink-mute hover:text-ink-soft"
                >
                  {showPw ? <FaEyeSlash aria-hidden /> : <FaEye aria-hidden />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-danger text-sm bg-danger-soft rounded-md px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="cl-btn cl-btn-primary cl-btn-lg cl-btn-block mt-1">
              {loading ? '로그인 중…' : '로그인'}
            </button>
          </form>
        </div>

        <p className="text-center text-paper/40 text-xs mt-6">
          계정 문의 <a href="mailto:lawchungsong@daum.net" className="text-paper/60 hover:text-paper">lawchungsong@daum.net</a>
        </p>
      </div>
    </main>
  );
}
