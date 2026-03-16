import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FaBalanceScale } from 'react-icons/fa';

export default function LoginPage() {
  const navigate       = useNavigate();
  const { login }      = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1E30] flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* 로고 */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FaBalanceScale className="text-[#C9A84C] text-3xl" />
            <h1 className="text-white text-2xl font-bold">케어로</h1>
          </div>
          <p className="text-gray-400 text-sm">가맹본사 어드민</p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-gray-400 text-xs">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@brand.co.kr"
              required
              className="w-full bg-[#1A2E44] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C] placeholder:text-gray-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-gray-400 text-xs">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#1A2E44] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C] placeholder:text-gray-600"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 rounded-xl px-4 py-3 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C9A84C] text-[#1E2D4E] font-bold py-3.5 rounded-xl text-base disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs">
          계정 문의: lawchungsong@daum.net
        </p>
      </div>
    </div>
  );
}
