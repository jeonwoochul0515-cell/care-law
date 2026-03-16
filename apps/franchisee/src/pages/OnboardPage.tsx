import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@care-law/shared';
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
  const [isRegister, setIsRegister] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // 브랜드 로드 후 로그인 화면 표시
  useEffect(() => {
    if (!bl) setStep(prev => prev === 'loading' ? 'login' : prev);
  }, [bl]);

  // 이미 활성 점주 → 홈
  useEffect(() => {
    if (user && claims?.role === 'franchisee' && claims.active) {
      navigate('/', { replace: true });
    }
  }, [user, claims]);

  // 로그인 완료 → 토큰 검증 또는 바로 홈으로
  useEffect(() => {
    if (step !== 'login' || !user) return;
    if (!token) {
      // 토큰 없으면 바로 홈으로 이동 (개발/테스트용)
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

  const bg   = brand?.primary_color ?? '#1E2D4E';
  const name = brand?.app_name ?? '법률케어';
  const logo = brand?.logo_url;

  if (step === 'loading') return (
    <div className="flex h-screen items-center justify-center" style={{ background: bg }}>
      <div className="text-white text-sm animate-pulse">잠시만 기다려 주세요...</div>
    </div>
  );

  if (step === 'verifying') return (
    <div className="flex flex-col h-screen items-center justify-center gap-4" style={{ background: bg }}>
      <div className="w-12 h-12 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      <p className="text-white text-sm">서비스 등록 중...</p>
    </div>
  );

  if (step === 'done') return (
    <div className="flex flex-col h-screen items-center justify-center gap-4" style={{ background: bg }}>
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-3xl text-white">✓</div>
      <p className="text-white font-bold text-lg">등록 완료!</p>
      <p className="text-white/60 text-sm">{name}으로 이동 중...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-6 gap-8"
         style={{ background: bg }}>
      {/* 로고 */}
      <div className="flex flex-col items-center gap-3">
        {logo
          ? <img src={logo} alt={name} className="w-20 h-20 rounded-2xl object-cover shadow-xl" />
          : <div className="w-20 h-20 rounded-2xl bg-[#C9A84C] flex items-center justify-center text-3xl font-bold text-[#1E2D4E]">C</div>
        }
        <h1 className="text-white text-2xl font-bold tracking-wide">{name}</h1>
        <p className="text-white/60 text-sm text-center leading-relaxed">
          가맹점주를 위한 법률 케어 서비스
        </p>
      </div>

      {/* 이메일 로그인 폼 */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-3">
        <div className="space-y-1">
          <label className="text-white/60 text-xs">이메일</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C] placeholder:text-white/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-white/60 text-xs">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C] placeholder:text-white/30"
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center bg-red-900/30 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={formLoading}
          className="w-full bg-[#C9A84C] text-[#1E2D4E] font-bold py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {formLoading ? '처리 중...' : isRegister ? '회원가입' : '로그인'}
        </button>

        <button
          type="button"
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
          className="text-white/50 text-xs text-center py-2"
        >
          {isRegister ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
        </button>
      </form>

      <p className="text-white/30 text-xs text-center px-4">
        로그인 시 서비스 이용약관 및 개인정보처리방침에 동의합니다
      </p>
    </div>
  );
}
