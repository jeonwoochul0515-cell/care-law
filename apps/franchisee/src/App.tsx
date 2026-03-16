import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore }  from './store/authStore';
import { useBrandStore } from './store/brandStore';
import OnboardPage    from './pages/OnboardPage';
import LockedPage     from './pages/LockedPage';
import HomePage       from './pages/HomePage';
import ChatPage       from './pages/ChatPage';
import BookingPage    from './pages/BookingPage';
import CasesPage      from './pages/CasesPage';
import DocumentsPage  from './pages/DocumentsPage';
import ProfilePage    from './pages/ProfilePage';
import FranchiseeLayout from './layouts/FranchiseeLayout';

function BrandInjector() {
  const { brand } = useBrandStore();
  useEffect(() => {
    if (!brand) return;
    document.documentElement.style.setProperty('--color-brand', brand.primary_color);
    document.title = brand.app_name;
  }, [brand]);
  return null;
}

function Guard({ children }: { children: React.ReactNode }) {
  const { user, claims, loading } = useAuthStore();
  if (loading) return (
    <div className="flex h-screen items-center justify-center"
         style={{ background: 'var(--color-brand, #1E2D4E)' }}>
      <div className="text-white text-sm animate-pulse">잠시만 기다려 주세요...</div>
    </div>
  );
  if (!user) return <Navigate to="/onboard" replace />;
  if (claims?.role !== 'franchisee') return <Navigate to="/onboard" replace />;
  if (claims?.active === false) return <Navigate to="/locked" replace />;
  return <>{children}</>;
}

export default function App() {
  const { initAuthListener } = useAuthStore();
  const { loadBrand }        = useBrandStore();

  useEffect(() => {
    loadBrand();
    const unsub = initAuthListener();
    return unsub;
  }, []);

  return (
    <BrowserRouter>
      <BrandInjector />
      <Routes>
        <Route path="/onboard"        element={<OnboardPage />} />
        <Route path="/onboard/:token" element={<OnboardPage />} />
        <Route path="/locked"         element={<LockedPage />} />
        <Route path="/" element={<Guard><FranchiseeLayout /></Guard>}>
          <Route index                element={<HomePage />} />
          <Route path="chat"          element={<ChatPage />} />
          <Route path="chat/:caseId"  element={<ChatPage />} />
          <Route path="booking"       element={<BookingPage />} />
          <Route path="cases"         element={<CasesPage />} />
          <Route path="documents"     element={<DocumentsPage />} />
          <Route path="profile"       element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
