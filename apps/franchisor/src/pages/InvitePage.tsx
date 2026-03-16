import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@care-law/shared';
import { FaCopy, FaCheckCircle, FaArrowLeft, FaLink } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const createInviteLinkFn = httpsCallable(functions, 'createInviteLink');

export default function InvitePage() {
  const navigate              = useNavigate();
  const [link, setLink]       = useState('');
  const [expiry, setExpiry]   = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState('');

  const generate = async () => {
    setLoading(true); setError(''); setLink('');
    try {
      const { data } = await createInviteLinkFn({}) as any;
      setLink(data.url);
      setExpiry(new Date(data.expiresAt).toLocaleDateString('ko-KR'));
    } catch (err: any) {
      setError(err.message ?? '링크 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    if (navigator.share) navigator.share({ title: '법률케어 초대', url: link });
    else copy();
  };

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/franchisees')} className="p-2 -ml-2">
          <FaArrowLeft className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">점주 초대</h1>
          <p className="text-gray-500 text-sm mt-0.5">초대 링크를 생성해 점주에게 전달하세요</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1.5">
        {['링크는 7일간 유효하며 1회만 사용할 수 있습니다',
          '점주가 회원가입 시 앱이 자동 활성화됩니다',
          '문자, 이메일로 전달하세요'].map((t, i) => (
          <div key={i} className="flex items-start gap-2">
            <FaCheckCircle className="text-blue-400 text-xs mt-0.5 flex-shrink-0" />
            <p className="text-blue-700 text-sm">{t}</p>
          </div>
        ))}
      </div>

      <button onClick={generate} disabled={loading}
              className="w-full bg-[#1E2D4E] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50">
        <FaLink className="text-[#C9A84C]" />
        {loading ? '생성 중...' : '초대 링크 생성'}
      </button>

      {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
        <p className="text-red-600 text-sm">{error}</p>
      </div>}

      {link && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-gray-900 font-bold text-sm">링크 생성 완료</p>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">만료: {expiry}</span>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <p className="text-gray-600 text-xs flex-1 truncate">{link}</p>
            <button onClick={copy}>
              {copied ? <FaCheckCircle className="text-green-500" /> : <FaCopy className="text-gray-400" />}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={copy}
                    className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              <FaCopy /> {copied ? '복사됨!' : '링크 복사'}
            </button>
            <button onClick={share}
                    className="flex-1 bg-[#1E2D4E] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              📤 공유하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
