import { useEffect, useState } from 'react';
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
import ProfilePage        from './pages/ProfilePage';
import NotificationsPage  from './pages/NotificationsPage';
import FranchiseeLayout from './layouts/FranchiseeLayout';

function BrandInjector() {
  const { brand } = useBrandStore();
  useEffect(() => {
    if (!brand) return;

    // CSS custom property & document title
    document.documentElement.style.setProperty('--color-brand', brand.primary_color);
    document.title = brand.app_name;

    // Dynamic theme-color meta tag
    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = brand.primary_color;

    // Dynamic PWA manifest via blob URL (blob: origin이므로 절대 URL 필수)
    const origin = window.location.origin;
    const manifest = {
      name: brand.app_name,
      short_name: brand.app_name,
      theme_color: brand.primary_color,
      background_color: brand.primary_color,
      display: 'standalone' as const,
      orientation: 'portrait' as const,
      start_url: origin + '/',
      icons: brand.logo_url
        ? [
            { src: brand.logo_url, sizes: '192x192', type: 'image/png' },
            { src: brand.logo_url, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ]
        : [
            { src: origin + '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: origin + '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          ],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(blob);

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    const previousManifestUrl = manifestLink.href.startsWith('blob:') ? manifestLink.href : null;
    manifestLink.href = manifestUrl;

    // Dynamic apple-touch-icon
    if (brand.logo_url) {
      let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = brand.logo_url;
    }

    return () => {
      // Revoke previous blob URL to avoid memory leaks
      if (previousManifestUrl) URL.revokeObjectURL(previousManifestUrl);
    };
  }, [brand]);
  return null;
}

function Guard({ children }: { children: React.ReactNode }) {
  const { user, claims, loading } = useAuthStore();
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-paper">
      <div className="text-ink-mute text-sm animate-pulse">잠시만 기다려 주세요…</div>
    </div>
  );
  if (!user) return <Navigate to="/onboard" replace />;
  if (claims?.role !== 'franchisee') return <Navigate to="/onboard" replace />;
  if (claims?.active === false) return <Navigate to="/locked" replace />;
  return <>{children}</>;
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#B23A2E',
        color: '#fff',
        textAlign: 'center',
        fontSize: '0.8125rem',
        fontWeight: 600,
        padding: '7px 12px',
        paddingTop: 'max(7px, env(safe-area-inset-top))',
      }}>
      인터넷 연결이 잠시 끊겼어요. 연결되면 자동으로 이어집니다.
    </div>
  );
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
      <OfflineBanner />
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
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
