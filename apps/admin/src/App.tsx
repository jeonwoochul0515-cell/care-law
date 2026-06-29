import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import BrandsPage       from './pages/BrandsPage';
import BrandDetailPage  from './pages/BrandDetailPage';
import CasesPage        from './pages/CasesPage';
import CaseDetailPage   from './pages/CaseDetailPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import SettingsPage     from './pages/SettingsPage';
import AdminLayout      from './layouts/AdminLayout';

function Guard({ children }: { children: React.ReactNode }) {
  const { user, claims, loading, signOut } = useAuthStore();
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-ink px-6">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-fade-up rounded-full bg-gold" />
        </div>
        <p className="text-sm text-paper/60">불러오는 중이에요</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if ((claims?.user_role ?? claims?.role) !== 'admin') return (
    <div className="flex h-screen items-center justify-center bg-ink px-6">
      <div className="max-w-xs space-y-3 text-center">
        <p className="font-display text-xl font-bold text-paper">접근 권한이 없어요</p>
        <p className="text-sm leading-relaxed text-paper/55">
          이 콘솔은 운영자 계정만 사용할 수 있어요. 운영자 계정으로 다시 로그인해 주세요.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-2 text-sm font-semibold text-gold underline-offset-4 hover:underline"
        >
          로그아웃
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
        <Route path="/" element={<Guard><AdminLayout /></Guard>}>
          <Route index                  element={<DashboardPage />} />
          <Route path="brands"          element={<BrandsPage />} />
          <Route path="brands/:id"      element={<BrandDetailPage />} />
          <Route path="cases"           element={<CasesPage />} />
          <Route path="cases/:id"      element={<CaseDetailPage />} />
          <Route path="subscriptions"   element={<SubscriptionsPage />} />
          <Route path="settings"        element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
