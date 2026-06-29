// 점주 온보딩 — 로그인/회원가입/초대토큰 검증 흐름 (곁/Care 아트 디렉션)
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@care-law/shared';
import { FaCheck, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useBrandStore } from '../store/brandStore';
import { useAuthStore }  from '../store/authStore';

const verifyFn = httpsCallable(functions, 'verifyInviteAndSetClaims');

type Step = 'loading' | 'login' | 'verifying' | 'done' | 'error';

export default function OnboardPage() {
  const { token }                = useParams<{ token?: string }>();
  const navigate                 = useNavigate();
  const { brand, loading: bl }   = useBrandStore();
  const { user, claims, login, register, refreshClaims } = useAuthStore();
  const [step, setStep]          = useState<Step>('loading');
  const [error, setError]        = useState('');
  const [email, setEmail]        = useState('');
  const [password, setPassword]  = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!bl) setStep(prev => prev === 'loading' ? 'login' : prev);
  }, [bl]);

  useEffect(() => {
    if (user && claims?.role === 'franchisee' && claims.active) {
      navigate('/', { replace: true });
    }
  }, [user, claims]);

  useEffect(() => {
    if (step !== 'login' || !user) return;
    if (!token) {
      setStep('done');
      setTimeout(() => navigate('/', { replace: true }), 500);
      return;
    }
    setStep('verifying');
    verifyFn({ token })
      .then(() => refreshClaims())
      .then(() => { setStep('done'); setTimeout(() => navigate('/', { replace: true }), 1200); })
      .catch(err => { setError(err.message ?? '초대 처리 중 오류가 발생했습니다.'); setStep('error'); });
  }, [step, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      setStep('login');
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/user-not-found') setError('등록되지 않은 이메일입니다.');
      else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setError('비밀번호가 올바르지 않습니다.');
      else if (code === 'auth/email-already-in-use') setError('이미 사용 중인 이메일입니다.');
      else if (code === 'auth/weak-password') setError('비밀번호는 6자 이상이어야 합니다.');
      else setError('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setFormLoading(false);
    }
  };

  const name = brand?.app_name ?? '케어로';
  const logo = brand?.logo_url;

  /* ── 로딩 ── */
  if (step === 'loading') return (
    <div className="flex h-screen items-center justify-center bg-paper">
      <p className="text-ink-mute text-sm animate-pulse">잠시만 기다려 주세요…</p>
    </div>
  );

  /* ── 검증 중 ── */
  if (step === 'verifying') return (
    <div className="flex flex-col h-screen items-center justify-center gap-5 bg-paper px-6">
      <div className="w-11 h-11 rounded-full border-[3px] border-line-strong border-t-gold animate-spin" />
      <p className="cl-display text-lg">서비스를 준비하고 있어요</p>
      <p className="text-ink-mute text-sm">잠시만 기다려 주세요.</p>
    </div>
  );

  /* ── 완료 ── */
  if (step === 'done') return (
    <div className="flex flex-col h-screen items-center justify-center gap-4 bg-paper px-6">
      <div className="w-16 h-16 rounded-full bg-success-soft flex items-center justify-center">
        <FaCheck className="text-success text-2xl" aria-hidden />
      </div>
      <p className="cl-display text-xl">준비가 끝났어요</p>
      <p className="text-ink-soft text-sm">{name}으로 이동합니다.</p>
    </div>
  );

  /* ── 초대 검증 오류 ── */
  if (step === 'error') return (
    <div className="flex flex-col h-screen items-center justify-center gap-4 bg-paper px-6 text-center">
      <p className="cl-display text-xl">연결이 매끄럽지 않았어요</p>
      <p className="text-ink-soft text-sm leading-relaxed max-w-xs" role="alert">{error}</p>
      <button onClick={() => { setError(''); setStep('login'); }} className="cl-btn cl-btn-primary mt-2">
        다시 시도하기
      </button>
    </div>
  );

  /* ── 메인: 로그인 / 회원가입 ── */
  return (
    <div className="flex flex-col min-h-screen bg-paper safe-top">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-md w-full mx-auto">

        {/* 브랜드 표식 */}
        <div className="flex flex-col items-center gap-4 mb-8 animation-fade-up">
          {logo
            ? <img src={logo} alt={name} className="w-16 h-16 rounded-xl object-contain bg-paper-raised border border-line p-1.5 shadow-card" />
            : <div className="w-16 h-16 rounded-xl bg-paper-raised border border-line flex items-center justify-center shadow-card">
                <span className="cl-display text-2xl text-gold">{name[0]}</span>
              </div>
          }
          <div className="text-center">
            <p className="cl-eyebrow cl-eyebrow-gold">가맹점주 법률 케어</p>
            <h1 className="cl-display text-2xl mt-2">{name}</h1>
            <p className="text-ink-soft text-sm mt-2">혼자 끌어안지 않도록, 곁에서 함께합니다.</p>
          </div>
        </div>

        {/* 폼 카드 */}
        <form onSubmit={handleSubmit} className="cl-card p-6 flex flex-col gap-4" noValidate>
          <p className="cl-display text-lg">{isRegister ? '계정 만들기' : '다시 오신 걸 환영해요'}</p>

          <div>
            <label htmlFor="email" className="cl-label">이메일</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="cl-input"
            />
          </div>

          <div>
            <label htmlFor="password" className="cl-label">비밀번호</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isRegister ? '6자 이상 입력해 주세요' : '비밀번호'}
                required
                minLength={6}
                className="cl-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-ink-mute hover:text-ink-soft transition-colors"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {error && (
              <p className="text-danger text-sm mt-2" role="alert">{error}</p>
            )}
          </div>

          <button type="submit" disabled={formLoading} className="cl-btn cl-btn-primary cl-btn-lg cl-btn-block mt-1">
            {formLoading ? '처리 중…' : isRegister ? '가입하고 시작하기' : '로그인'}
          </button>

          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-ink-soft text-sm text-center py-1 hover:text-ink transition-colors"
          >
            {isRegister ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 계정 만들기'}
          </button>
        </form>

        <p className="text-ink-mute text-xs text-center px-4 mt-6 leading-relaxed">
          로그인하면 서비스 이용약관과 개인정보처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
