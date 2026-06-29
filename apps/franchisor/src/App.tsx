import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FaBalanceScale } from 'react-icons/fa';
import { useAuthStore }   from './store/authStore';
import LoginPage          from './pages/LoginPage';
import DashboardPage      from './pages/DashboardPage';
import BrandingPage       from './pages/BrandingPage';
import FranchiseesPage    from './pages/FranchiseesPage';
import InvitePage         from './pages/InvitePage';
import CasesPage          from './pages/CasesPage';
import SubscriptionPage   from './pages/SubscriptionPage';
import FranchisorLayout   from './layouts/FranchisorLayout';

function Guard({ children }: { children: React.ReactNode }) {
  const { user, claims, loading, signOut } = useAuthStore();
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-ink" role="status" aria-label="불러오는 중">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-gold animate-dot-bounce" />
        <span className="w-2 h-2 rounded-full bg-gold animate-dot-bounce" style={{ animationDelay: '0.15s' }} />
        <span className="w-2 h-2 rounded-full bg-gold animate-dot-bounce" style={{ animationDelay: '0.3s' }} />
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (claims?.role !== 'franchisor' || !claims?.brand_id) return (
    <div className="flex h-screen items-center justify-center bg-ink px-6">
      <div className="text-center max-w-sm space-y-4">
        <FaBalanceScale className="text-gold text-3xl mx-auto" aria-hidden />
        <div className="space-y-1.5">
          <p className="cl-display text-paper text-xl">접근 권한이 없어요</p>
          <p className="text-sm text-paper/55">가맹본사 콘솔은 본사 운영자 계정으로만 들어올 수 있습니다. 다른 계정으로 다시 로그인해 주세요.</p>
        </div>
        <button onClick={() => signOut()} className="cl-btn cl-btn-gold cl-btn-sm">
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  );
  return <>{children}</>;
}

export default function App() {
  const { init } = useAuthStore();
  useEffect(() => { const unsub = init(); return unsub; }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Guard><FranchisorLayout /></Guard>}>
          <Route index                     element={<DashboardPage />} />
          <Route path="branding"           element={<BrandingPage />} />
          <Route path="franchisees"        element={<FranchiseesPage />} />
          <Route path="franchisees/invite" element={<InvitePage />} />
          <Route path="cases"              element={<CasesPage />} />
          <Route path="subscription"       element={<SubscriptionPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
