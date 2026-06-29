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

  const name = brand?.app_name ?? '호맥생활';
  const logo = brand?.logo_url;

  /* ── 로딩 ── */
  if (step === 'loading') return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden">
      <img src="/homac-store.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative text-white text-sm animate-pulse">잠시만 기다려 주세요...</div>
    </div>
  );

  /* ── 검증 중 ── */
  if (step === 'verifying') return (
    <div className="relative flex flex-col h-screen items-center justify-center gap-4 overflow-hidden">
      <img src="/homac-store.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white text-sm">서비스 등록 중...</p>
      </div>
    </div>
  );

  /* ── 완료 ── */
  if (step === 'done') return (
    <div className="relative flex flex-col h-screen items-center justify-center gap-4 overflow-hidden">
      <img src="/homac-store.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-3xl text-white shadow-lg shadow-emerald-500/30">✓</div>
        <p className="text-white font-bold text-lg">등록 완료!</p>
        <p className="text-white/60 text-sm">{name}으로 이동 중...</p>
      </div>
    </div>
  );

  /* ── 메인: 로그인 폼 ── */
  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden">
      {/* 배경 이미지 */}
      <img src="/homac-store.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />

      {/* 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/85" />

      {/* 컨텐츠 */}
      <div className="relative flex flex-col min-h-screen items-center justify-center px-6 gap-6">

        {/* 로고 + 브랜드명 */}
        <div className="flex flex-col items-center gap-3 mb-2">
          {logo
            ? <img src={logo} alt={name} className="w-24 h-24 rounded-2xl object-contain bg-white/90 shadow-2xl p-2 backdrop-blur-sm" />
            : <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center shadow-2xl border border-white/10">
                <span className="text-4xl font-black text-amber-400 tracking-tighter">H</span>
              </div>
          }
          <h1 className="text-white text-3xl font-black tracking-wider drop-shadow-lg">{name}</h1>
          <p className="text-white/50 text-sm text-center leading-relaxed">
            가맹점주를 위한 법률 케어 서비스
          </p>
        </div>

        {/* 글래스모피즘 로그인 카드 */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm flex flex-col gap-3 bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 shadow-2xl"
        >
          <div className="space-y-1.5">
            <label className="text-white/70 text-xs font-medium ml-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all focus:border-amber-400 focus:bg-white/15 focus:ring-1 focus:ring-amber-400/30 placeholder:text-white/25"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/70 text-xs font-medium ml-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all focus:border-amber-400 focus:bg-white/15 focus:ring-1 focus:ring-amber-400/30 placeholder:text-white/25"
            />
          </div>

          {error && (
            <p className="text-red-300 text-xs text-center bg-red-900/40 backdrop-blur-sm rounded-xl px-4 py-3 border border-red-500/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={formLoading}
            className="w-full mt-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-amber-500/25 active:scale-[0.97] transition-all disabled:opacity-50 hover:shadow-amber-500/40"
          >
            {formLoading ? '처리 중...' : isRegister ? '회원가입' : '로그인'}
          </button>

          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-white/40 text-xs text-center py-2 hover:text-white/60 transition-colors"
          >
            {isRegister ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </form>

        <p className="text-white/20 text-[11px] text-center px-4 mt-2">
          로그인 시 서비스 이용약관 및 개인정보처리방침에 동의합니다
        </p>
      </div>
    </div>
  );
}
