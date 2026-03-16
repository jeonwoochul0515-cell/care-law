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
    <div className="flex h-screen items-center justify-center bg-[#0F1E30]">
      <div className="w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (claims?.role !== 'admin') return (
    <div className="flex h-screen items-center justify-center bg-[#0F1E30]">
      <div className="text-center text-white space-y-4">
        <p className="text-lg font-bold">권한이 없습니다</p>
        <p className="text-sm text-gray-400">어드민 계정으로 로그인해주세요</p>
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
