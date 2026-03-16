import { useNavigate }  from 'react-router-dom';
import { useBrandStore } from '../store/brandStore';
import { FaArrowLeft, FaUpload, FaFileAlt, FaLock } from 'react-icons/fa';

export default function DocumentsPage() {
  const navigate   = useNavigate();
  const { brand }  = useBrandStore();
  const brandColor = brand?.primary_color ?? '#1E2D4E';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="text-white px-4 pt-12 pb-4 safe-top" style={{ background: brandColor }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <FaArrowLeft className="text-white/80" />
          </button>
          <h1 className="font-bold text-lg">문서 관리</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-4 pb-24">
        {/* 업로드 버튼 */}
        <button className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
               style={{ background: brandColor + '15' }}>
            <FaUpload style={{ color: brandColor }} className="text-xl" />
          </div>
          <p className="font-bold text-gray-700 text-sm">문서 업로드</p>
          <p className="text-gray-400 text-xs">계약서·증거자료 PDF, 이미지 · 최대 30MB</p>
        </button>

        {/* AI 분석 안내 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: brandColor + '15' }}>
              <FaFileAlt style={{ color: brandColor }} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">AI 계약서 분석</p>
              <p className="text-gray-400 text-xs">위험 조항 자동 감지</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed">
            계약서를 업로드하면 AI가 불리한 조항, 주의할 내용을 자동으로 분석해드립니다.
          </p>
        </div>

        {/* 보안 안내 */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
          <FaLock className="text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-gray-500 text-xs leading-relaxed">
            업로드된 문서는 암호화 저장되며, 담당 변호사 외에는 열람할 수 없습니다.
          </p>
        </div>

        <p className="text-center text-gray-300 text-xs py-4">업로드된 문서가 없습니다</p>
      </main>
    </div>
  );
}
