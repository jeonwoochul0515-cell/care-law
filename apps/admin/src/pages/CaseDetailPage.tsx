import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@care-law/shared';
import type { Case, Message } from '@care-law/shared';
import { FaArrowLeft, FaUser, FaRobot, FaFileAlt, FaPaperclip, FaExternalLinkAlt, FaFilePdf, FaImage } from 'react-icons/fa';

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-yellow-50 text-yellow-700',
  consulting: 'bg-blue-50 text-blue-700',
  retained: 'bg-purple-50 text-purple-700',
  closed: 'bg-gray-100 text-gray-500',
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandName, setBrandName] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('carelaw_cases').select('*').eq('id', id).single(),
      supabase.from('carelaw_messages').select('*').eq('case_id', id).order('created_at', { ascending: true }),
    ]).then(async ([c, m]) => {
      const cs = c.data as Case;
      setCaseData(cs);
      setMessages(m.data as Message[] ?? []);
      if (cs?.brand_id) {
        const { data: brand } = await supabase.from('carelaw_brands').select('name').eq('id', cs.brand_id).single();
        setBrandName(brand?.name ?? '');
      }
      setLoading(false);
    });
  }, [id]);

  // AI가 작성한 페이퍼(사건 요약 보고서) 찾기
  const paperMessage = [...messages].reverse().find((m: Message) =>
    m.role === 'assistant' && m.content.includes('사건 요약 보고서')
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!caseData) return (
    <div className="p-6 text-center text-gray-400">케이스를 찾을 수 없습니다</div>
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <button onClick={() => navigate('/cases')}
              className="text-sm text-gray-500 hover:text-gray-700">&larr; 케이스 목록</button>

      {/* 케이스 헤더 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {brandName && <span className="text-[#C9A84C] font-medium">{brandName}</span>}
              {brandName && ' · '}
              {CASE_TYPE_LABELS[caseData.type]} · {new Date(caseData.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_STYLE[caseData.status] ?? ''}`}>
            {CASE_STATUS_LABELS[caseData.status]}
          </span>
        </div>
      </div>

      {/* AI 페이퍼 (있으면 상단에 강조) */}
      {paperMessage && (
        <div className="bg-[#FDF8EE] border border-[#C9A84C]/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaFileAlt className="text-[#C9A84C]" />
            <h2 className="font-bold text-gray-900">AI 사무장 보고서</h2>
          </div>
          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {paperMessage.content}
          </div>
        </div>
      )}

      {/* 첨부파일 목록 */}
      {caseData.attachments && caseData.attachments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaPaperclip className="text-gray-500" />
            <h2 className="font-bold text-gray-900">첨부파일 ({caseData.attachments.length}건)</h2>
          </div>
          <div className="space-y-2">
            {caseData.attachments.map((url, i) => {
              const name = decodeURIComponent(url.split('/').pop() ?? `파일 ${i + 1}`);
              const isPdf = url.toLowerCase().endsWith('.pdf');
              const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
              return (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  {isPdf ? <FaFilePdf className="text-red-500 text-lg flex-shrink-0" />
                    : isImg ? <FaImage className="text-blue-500 text-lg flex-shrink-0" />
                    : <FaFileAlt className="text-gray-500 text-lg flex-shrink-0" />}
                  <span className="text-sm text-gray-700 flex-1 truncate">{name}</span>
                  <FaExternalLinkAlt className="text-gray-400 text-xs flex-shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* 대화 내역 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">대화 내역 ({messages.length}건)</h2>
          <span className="text-xs text-gray-400">사무장 ↔ 의뢰인</span>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">대화 내역이 없습니다</p>
          ) : messages.map(msg => (
            <div key={msg.id} className={`px-5 py-3 border-b border-gray-50 last:border-0 ${
              msg.role === 'assistant' ? 'bg-gray-50/50' : ''
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {msg.role === 'user' ? (
                  <>
                    <FaUser className="text-[#1E2D4E] text-xs" />
                    <span className="text-xs font-bold text-[#1E2D4E]">의뢰인</span>
                  </>
                ) : (
                  <>
                    <FaRobot className="text-[#C9A84C] text-xs" />
                    <span className="text-xs font-bold text-[#C9A84C]">AI 사무장</span>
                  </>
                )}
                <span className="text-[10px] text-gray-400 ml-auto">
                  {new Date(msg.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-5">
                {msg.content.startsWith('📎') && msg.content.includes('[첨부파일:') ? (
                  <div className="flex items-center gap-2 py-1">
                    <FaPaperclip className="text-blue-500 text-xs" />
                    <span className="text-blue-600 font-medium">{msg.content.split('\n')[0]}</span>
                    {msg.content.split('\n').slice(1).join('\n') && (
                      <span className="block mt-1 text-gray-600">{msg.content.split('\n').slice(1).join('\n')}</span>
                    )}
                  </div>
                ) : msg.content.length > 500 && !msg.content.includes('사건 요약 보고서')
                  ? msg.content.slice(0, 500) + '...'
                  : msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
