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
  if (type === 'application/pdf') return <FaFilePdf className="text-danger" aria-hidden />;
  if (type.startsWith('image/')) return <FaFileImage className="text-gold" aria-hidden />;
  return <FaFileAlt className="text-ink-mute" aria-hidden />;
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
    <div className="flex flex-col min-h-screen bg-paper">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <header className="bg-paper-raised border-b border-line safe-top">
        <div className="px-3 pb-3 pt-1 flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label="뒤로 가기"
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-ink-soft hover:bg-paper-sunken transition-colors">
            <FaArrowLeft />
          </button>
          <div>
            <p className="cl-eyebrow cl-eyebrow-gold">계약서·증거자료</p>
            <h1 className="cl-display text-xl">문서 보관함</h1>
            {!loading && (
              <p className="text-ink-mute text-xs mt-0.5 cl-num">
                케이스 {cases.length}건 · 문서 {totalAttachments}개
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
          className="w-full bg-paper-raised border border-dashed border-line-strong rounded-lg p-6 flex flex-col items-center gap-2.5 active:translate-y-px transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gold-soft">
            {uploading ? (
              <FaSpinner className="text-xl animate-spin text-gold" aria-hidden />
            ) : (
              <FaUpload className="text-xl text-gold" aria-hidden />
            )}
          </div>
          <p className="font-semibold text-ink text-sm">
            {uploading ? '올리는 중이에요…' : '문서 올리기'}
          </p>
          <p className="text-ink-mute text-xs">
            계약서·증거자료 PDF, 이미지 · 최대 10MB
          </p>
        </button>

        {/* Upload error */}
        {uploadError && (
          <div className="bg-danger-soft border border-danger/20 rounded-lg p-4 flex items-start gap-3" role="alert">
            <FaExclamationTriangle className="text-danger mt-0.5 flex-shrink-0" aria-hidden />
            <p className="flex-1 text-danger text-sm leading-relaxed">{uploadError}</p>
            <button onClick={() => setUploadError(null)} aria-label="닫기"
                    className="text-danger/50 hover:text-danger">
              <FaTimes className="text-xs" />
            </button>
          </div>
        )}

        {/* Upload success */}
        {uploadSuccess && (
          <div className="bg-success-soft border border-success/20 rounded-lg p-4 flex items-start gap-3" role="status">
            <FaFileAlt className="text-success mt-0.5 flex-shrink-0" aria-hidden />
            <p className="text-success text-sm leading-relaxed flex-1">{uploadSuccess}</p>
            <button onClick={() => setUploadSuccess(null)} aria-label="닫기"
                    className="text-success/50 hover:text-success">
              <FaTimes className="text-xs" />
            </button>
          </div>
        )}

        {/* Case picker modal */}
        {showCasePicker && (
          <div className="cl-card overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <p className="font-semibold text-ink text-sm">어느 케이스에 넣을까요?</p>
              <button onClick={() => setShowCasePicker(false)} aria-label="닫기" className="text-ink-mute hover:text-ink-soft">
                <FaTimes />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-line">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setShowCasePicker(false);
                    startUpload(c.id);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-paper-sunken active:bg-paper-sunken transition-colors"
                >
                  <p className="font-medium text-ink text-sm truncate">{c.title}</p>
                  <p className="text-ink-mute text-xs mt-0.5">
                    {CASE_TYPE_LABELS[c.type]} · {CASE_STATUS_LABELS[c.status]}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI analysis info */}
        <div className="cl-card-sunken p-4">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gold-soft">
              <FaFileAlt className="text-gold" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-ink text-sm">AI 계약서 살펴보기</p>
              <p className="text-ink-mute text-xs">주의할 조항을 미리 짚어 드려요</p>
            </div>
          </div>
          <p className="text-ink-soft text-sm leading-relaxed">
            계약서를 올리면 불리할 수 있는 조항과 챙겨야 할 부분을 AI가 정리해 드립니다.
          </p>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map(i => (
              <div key={i} className="cl-card p-4">
                <div className="cl-skeleton h-4 w-1/2 mb-2.5" />
                <div className="cl-skeleton h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : cases.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-gold-soft flex items-center justify-center">
              <FaFileAlt className="text-2xl text-gold" aria-hidden />
            </div>
            <div>
              <p className="cl-display text-lg">아직 보관된 문서가 없어요</p>
              <p className="text-ink-soft text-sm mt-1.5 leading-relaxed">
                상담을 시작하면 그 케이스에<br />계약서와 자료를 안전하게 모아 둘 수 있어요.
              </p>
            </div>
            <button onClick={() => navigate('/chat')} className="cl-btn cl-btn-primary mt-1">
              상담 시작하기
            </button>
          </div>
        ) : (
          /* Cases with documents */
          <div className="space-y-3">
            <p className="cl-eyebrow px-1">케이스별 첨부 문서</p>
            {cases.map((c) => {
              const attachments = parseAttachments(c.attachments);
              const isExpanded = expandedCase === c.id;

              return (
                <div key={c.id} className="cl-card overflow-hidden">
                  {/* Case header */}
                  <button
                    onClick={() => setExpandedCase(isExpanded ? null : c.id)}
                    aria-expanded={isExpanded}
                    className="w-full text-left px-4 py-3.5 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink text-sm truncate">{c.title}</p>
                        {attachments.length > 0 && (
                          <span className="cl-badge cl-badge-gold flex-shrink-0 cl-num">
                            {attachments.length}
                          </span>
                        )}
                      </div>
                      <p className="text-ink-mute text-xs mt-0.5 cl-num">
                        {CASE_TYPE_LABELS[c.type]} ·{' '}
                        {format(parseISO(c.created_at), 'yyyy.MM.dd', { locale: ko })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-ink-mute">
                      {isExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                    </div>
                  </button>

                  {/* Expanded: attachments + upload */}
                  {isExpanded && (
                    <div className="border-t border-line px-4 py-3 space-y-2">
                      {attachments.length === 0 ? (
                        <p className="text-ink-mute text-sm text-center py-3">
                          이 케이스엔 아직 문서가 없어요
                        </p>
                      ) : (
                        attachments.map((att, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-paper-sunken rounded-md px-3 py-2.5">
                            <div className="w-8 h-8 rounded-md bg-paper-raised flex items-center justify-center flex-shrink-0 border border-line">
                              {fileIcon(att.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-ink text-sm font-medium truncate">{att.name}</p>
                              {att.uploadedAt && (
                                <p className="text-ink-mute text-2xs mt-0.5 cl-num">
                                  {format(parseISO(att.uploadedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => handlePreview(att.url)} aria-label="미리보기"
                                      className="p-2 text-ink-mute hover:text-ink-soft transition-colors">
                                <FaEye className="text-xs" />
                              </button>
                              <a href={att.url} download={att.name} aria-label="다운로드"
                                 className="p-2 text-ink-mute hover:text-ink-soft transition-colors">
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
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-dashed border-line-strong text-sm font-medium text-ink-soft transition-colors hover:border-ink-mute disabled:opacity-50"
                      >
                        {uploading && selectedCaseId === c.id ? (
                          <><FaSpinner className="animate-spin" aria-hidden /> 올리는 중…</>
                        ) : (
                          <><FaUpload aria-hidden /> 이 케이스에 문서 넣기</>
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
        <div className="cl-card-sunken p-4 flex items-start gap-3">
          <FaLock className="text-ink-mute mt-0.5 flex-shrink-0" aria-hidden />
          <p className="text-ink-soft text-sm leading-relaxed">
            올려 주신 문서는 암호화해 보관하며, 담당 변호사 외에는 누구도 열어볼 수 없어요.
          </p>
        </div>
      </main>
    </div>
  );
}
