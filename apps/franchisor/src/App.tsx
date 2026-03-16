import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
    <div className="flex h-screen items-center justify-center bg-[#0F1E30]">
      <div className="w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (claims?.role !== 'franchisor' || !claims?.brand_id) return (
    <div className="flex h-screen items-center justify-center bg-[#0F1E30]">
      <div className="text-center text-white space-y-4">
        <p className="text-lg font-bold">권한이 없습니다</p>
        <p className="text-sm text-gray-400">가맹본사 계정으로 로그인해주세요</p>
        <button onClick={() => signOut()} className="text-sm text-[#C9A84C] underline">로그아웃</button>
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
