import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaComments, FaFolderOpen, FaUser } from 'react-icons/fa';
import { useBrandStore } from '../store/brandStore';

const NAV = [
  { icon: FaHome,       label: '홈',    path: '/'       },
  { icon: FaComments,   label: '상담',  path: '/chat'   },
  { icon: FaFolderOpen, label: '케이스', path: '/cases'  },
  { icon: FaUser,       label: '내 정보', path: '/profile'},
];

export default function FranchiseeLayout() {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const { brand }    = useBrandStore();
  const color        = brand?.primary_color ?? '#1E2D4E';

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-50">
        <div className="flex">
          {NAV.map(({ icon: Icon, label, path }) => {
            const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex-1 flex flex-col items-center py-2.5 gap-0.5 active:scale-90 transition-transform"
              >
                <Icon className="text-lg" style={{ color: active ? color : '#9CA3AF' }} />
                <span className="text-xs" style={{ color: active ? color : '#9CA3AF' }}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
