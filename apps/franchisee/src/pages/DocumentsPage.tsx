import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, functions, CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@care-law/shared';
import type { Case } from '@care-law/shared';
import { httpsCallable } from 'firebase/functions';
import { useAuthStore } from '../store/authStore';
import { useBrandStore } from '../store/brandStore';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FaArrowLeft,
  FaUpload,
  FaFileAlt,
  FaFilePdf,
  FaFileImage,
  FaLock,
  FaDownload,
  FaEye,
  FaSpinner,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaExclamationTriangle,
} from 'react-icons/fa';

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface Attachment {
  url: string;
  name: string;
  type: string;
  uploadedAt: string;
}

/** Parse the attachments JSON array from a case row. Each entry is either a plain URL string or a JSON object. */
function parseAttachments(raw: string[]): Attachment[] {
  return (raw ?? []).map((entry) => {
    if (typeof entry === 'object' && entry !== null) {
      return entry as unknown as Attachment;
    }
    // Plain URL string — derive name from path
    const url = String(entry);
    const segments = url.split('/');
    const name = decodeURIComponent(segments[segments.length - 1] || 'document');
    const isPdf = name.toLowerCase().endsWith('.pdf');
    return {
      url,
      name,
      type: isPdf ? 'application/pdf' : 'image/*',
      uploadedAt: '',
    };
  });
}

function fileIcon(type: string) {
  if (type === 'application/pdf') return <FaFilePdf className="text-red-400" />;
  if (type.startsWith('image/')) return <FaFileImage className="text-blue-400" />;
  return <FaFileAlt className="text-gray-400" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { brand } = useBrandStore();
  const brandColor = brand?.primary_color ?? '#1E2D4E';

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showCasePicker, setShowCasePicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's cases
  const fetchCases = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('carelaw_cases')
      .select('*')
      .eq('user_uid', user.uid)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCases(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Count total attachments
  const totalAttachments = cases.reduce(
    (sum, c) => sum + (c.attachments?.length ?? 0),
    0
  );

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:... prefix to get raw base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('PDF 또는 이미지 파일(PNG, JPG, WebP)만 업로드할 수 있습니다.');
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`파일 크기가 ${formatFileSize(MAX_FILE_SIZE)}를 초과합니다. (현재: ${formatFileSize(file.size)})`);
      return;
    }

    // If no case selected, prompt to pick one
    if (!selectedCaseId) {
      setUploadError('문서를 첨부할 케이스를 먼저 선택해주세요.');
      setShowCasePicker(true);
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setUploading(true);

    try {
      const base64 = await fileToBase64(file);

      const uploadDocFn = httpsCallable(functions, 'uploadDocument');
      await uploadDocFn({
        caseId: selectedCaseId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        base64Data: base64,
      });

      setUploadSuccess(`"${file.name}" 업로드 완료`);
      // Refresh cases to show the new attachment
      await fetchCases();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  // Trigger file input for a specific case
  const startUpload = (caseId: string) => {
    setSelectedCaseId(caseId);
    setUploadError(null);
    setUploadSuccess(null);
    fileInputRef.current?.click();
  };

  // Global upload button (no case pre-selected)
  const handleGlobalUpload = () => {
    if (cases.length === 0) {
      setUploadError('문서를 첨부할 케이스가 없습니다. 먼저 AI 상담을 시작해주세요.');
      return;
    }
    if (cases.length === 1) {
      startUpload(cases[0].id);
      return;
    }
    setShowCasePicker(true);
  };

  // Preview / download attachment
  const handlePreview = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <header
        className="text-white px-4 pt-12 pb-4 safe-top"
        style={{ background: brandColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <FaArrowLeft className="text-white/80" />
          </button>
          <div>
            <h1 className="font-bold text-lg">문서 관리</h1>
            {!loading && (
              <p className="text-white/60 text-xs mt-0.5">
                {cases.length}건의 케이스 · {totalAttachments}개 문서
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-4 pb-24">
        {/* Upload button */}
        <button
          onClick={handleGlobalUpload}
          disabled={uploading}
          className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: brandColor + '15' }}
          >
            {uploading ? (
              <FaSpinner
                className="text-xl animate-spin"
                style={{ color: brandColor }}
              />
            ) : (
              <FaUpload style={{ color: brandColor }} className="text-xl" />
            )}
          </div>
          <p className="font-bold text-gray-700 text-sm">
            {uploading ? '업로드 중...' : '문서 업로드'}
          </p>
          <p className="text-gray-400 text-xs">
            계약서·증거자료 PDF, 이미지 · 최대 10MB
          </p>
        </button>

        {/* Upload error */}
        {uploadError && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
            <FaExclamationTriangle className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 text-xs leading-relaxed">{uploadError}</p>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-red-300 hover:text-red-500"
            >
              <FaTimes className="text-xs" />
            </button>
          </div>
        )}

        {/* Upload success */}
        {uploadSuccess && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
            <FaFileAlt className="text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-green-700 text-xs leading-relaxed flex-1">
              {uploadSuccess}
            </p>
            <button
              onClick={() => setUploadSuccess(null)}
              className="text-green-300 hover:text-green-500"
            >
              <FaTimes className="text-xs" />
            </button>
          </div>
        )}

        {/* Case picker modal */}
        {showCasePicker && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">
                케이스를 선택하세요
              </p>
              <button
                onClick={() => setShowCasePicker(false)}
                className="text-gray-400"
              >
                <FaTimes />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setShowCasePicker(false);
                    startUpload(c.id);
                  }}
                  className="w-full text-left px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {c.title}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {CASE_TYPE_LABELS[c.type]} · {CASE_STATUS_LABELS[c.status]}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI analysis info */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: brandColor + '15' }}
            >
              <FaFileAlt style={{ color: brandColor }} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">AI 계약서 분석</p>
              <p className="text-gray-400 text-xs">위험 조항 자동 감지</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed">
            계약서를 업로드하면 AI가 불리한 조항, 주의할 내용을 자동으로
            분석해드립니다.
          </p>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 rounded-full border-gray-200 border-t-gray-400 animate-spin" />
          </div>
        ) : cases.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <FaFileAlt className="text-4xl text-gray-200" />
            <p className="text-gray-400 text-sm text-center">
              아직 케이스가 없습니다
              <br />
              AI 상담을 시작하면 문서를 첨부할 수 있습니다
            </p>
            <button
              onClick={() => navigate('/chat')}
              className="text-white text-sm font-bold px-5 py-3 rounded-2xl"
              style={{ background: brandColor }}
            >
              AI 상담 시작하기
            </button>
          </div>
        ) : (
          /* Cases with documents */
          <div className="space-y-3">
            <p className="text-gray-500 text-xs font-medium px-1">
              케이스별 첨부 문서
            </p>
            {cases.map((c) => {
              const attachments = parseAttachments(c.attachments);
              const isExpanded = expandedCase === c.id;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Case header */}
                  <button
                    onClick={() =>
                      setExpandedCase(isExpanded ? null : c.id)
                    }
                    className="w-full text-left px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {c.title}
                        </p>
                        {attachments.length > 0 && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                            style={{
                              background: brandColor + '15',
                              color: brandColor,
                            }}
                          >
                            {attachments.length}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {CASE_TYPE_LABELS[c.type]} ·{' '}
                        {format(parseISO(c.created_at), 'yyyy.MM.dd', {
                          locale: ko,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isExpanded ? (
                        <FaChevronUp className="text-gray-300 text-xs" />
                      ) : (
                        <FaChevronDown className="text-gray-300 text-xs" />
                      )}
                    </div>
                  </button>

                  {/* Expanded: attachments + upload */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 px-4 py-3 space-y-2">
                      {attachments.length === 0 ? (
                        <p className="text-gray-300 text-xs text-center py-3">
                          첨부된 문서가 없습니다
                        </p>
                      ) : (
                        attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-gray-100">
                              {fileIcon(att.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-800 text-xs font-medium truncate">
                                {att.name}
                              </p>
                              {att.uploadedAt && (
                                <p className="text-gray-400 text-[10px] mt-0.5">
                                  {format(
                                    parseISO(att.uploadedAt),
                                    'yyyy.MM.dd HH:mm',
                                    { locale: ko }
                                  )}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handlePreview(att.url)}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                title="미리보기"
                              >
                                <FaEye className="text-xs" />
                              </button>
                              <a
                                href={att.url}
                                download={att.name}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                title="다운로드"
                              >
                                <FaDownload className="text-xs" />
                              </a>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Per-case upload button */}
                      <button
                        onClick={() => startUpload(c.id)}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-200 text-xs font-medium transition-colors hover:border-gray-300 disabled:opacity-50"
                        style={{ color: brandColor }}
                      >
                        {uploading && selectedCaseId === c.id ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            업로드 중...
                          </>
                        ) : (
                          <>
                            <FaUpload />
                            이 케이스에 문서 첨부
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Security notice */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
          <FaLock className="text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-gray-500 text-xs leading-relaxed">
            업로드된 문서는 암호화 저장되며, 담당 변호사 외에는 열람할 수
            없습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
