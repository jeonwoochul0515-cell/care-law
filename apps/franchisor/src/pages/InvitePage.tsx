// 점주 초대 — 1회용 초대 링크 생성·복사·공유
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@care-law/shared';
import { FaCopy, FaCheckCircle, FaArrowLeft, FaLink, FaShareAlt } from 'react-icons/fa';
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
      setError(err.message ?? '링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
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
    <div className="p-5 sm:p-8 max-w-lg mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/franchisees')} aria-label="점주 관리로 돌아가기" className="cl-btn cl-btn-ghost cl-btn-sm -ml-2 px-2">
          <FaArrowLeft aria-hidden />
        </button>
        <div>
          <p className="cl-eyebrow mb-1">운영 콘솔</p>
          <h1 className="cl-display text-2xl">점주 초대</h1>
        </div>
      </header>

      <div className="cl-card-sunken p-4 space-y-2 mb-6">
        {['초대 링크는 7일간 유효하며 한 번만 사용할 수 있어요.',
          '점주가 가입을 마치면 앱이 자동으로 활성화됩니다.',
          '문자나 이메일로 링크를 전달하세요.'].map((t, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <FaCheckCircle className="text-gold text-xs mt-1 flex-none" aria-hidden />
            <p className="text-ink-soft text-sm">{t}</p>
          </div>
        ))}
      </div>

      <button onClick={generate} disabled={loading} className="cl-btn cl-btn-primary cl-btn-lg cl-btn-block">
        <FaLink aria-hidden />
        {loading ? '생성 중…' : '초대 링크 만들기'}
      </button>

      {error && (
        <p role="alert" className="text-danger text-sm bg-danger-soft rounded-md px-3.5 py-2.5 mt-4">{error}</p>
      )}

      {link && (
        <div className="cl-card p-4 space-y-3 mt-5 animate-fade-up">
          <div className="flex items-center justify-between">
            <p className="text-ink font-semibold text-sm">링크를 만들었어요</p>
            <span className="cl-badge cl-badge-gold">만료 {expiry}</span>
          </div>
          <div className="cl-card-sunken px-3 py-2.5 flex items-center gap-2">
            <p className="text-ink-soft text-xs flex-1 truncate">{link}</p>
            <button onClick={copy} aria-label="링크 복사" className="text-ink-mute hover:text-ink-soft flex-none">
              {copied ? <FaCheckCircle className="text-success" aria-hidden /> : <FaCopy aria-hidden />}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={copy} className="cl-btn cl-btn-secondary cl-btn-block">
              <FaCopy aria-hidden /> {copied ? '복사됨' : '링크 복사'}
            </button>
            <button onClick={share} className="cl-btn cl-btn-primary cl-btn-block">
              <FaShareAlt aria-hidden /> 공유
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
