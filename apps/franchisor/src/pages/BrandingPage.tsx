// 브랜드 설정 — 점주 앱에 노출되는 이름·로고·컬러 관리
import { useEffect, useState, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { supabase, functions } from '@care-law/shared';
import { useAuthStore } from '../store/authStore';
import { FaUpload, FaCheckCircle, FaBalanceScale } from 'react-icons/fa';

const uploadLogoFn = httpsCallable(functions, 'uploadLogo');

const PRESETS = ['#1E2D4E','#C9A84C','#1A6B3C','#B83232','#2D4A65','#8B5CF6','#EC4899','#0EA5E9'];

export default function BrandingPage() {
  const { claims }  = useAuthStore();
  const brandId     = claims?.brand_id ?? '';
  const fileRef     = useRef<HTMLInputElement>(null);
  const [appName, setAppName]     = useState('');
  const [color, setColor]         = useState('#1E2D4E');
  const [logoUrl, setLogoUrl]     = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saving, setSaving]       = useState(false);
  // 저장 결과 피드백: '' | 'saved' | 'error'
  const [saveState, setSaveState] = useState<'' | 'saved' | 'error'>('');

  useEffect(() => {
    if (!brandId) return;
    supabase.from('carelaw_brands').select('*').eq('id', brandId).single().then(({ data }) => {
      if (!data) return;
      setAppName(data.app_name); setColor(data.primary_color); setLogoUrl(data.logo_url ?? '');
    });
  }, [brandId]);

  const resizeImage = (file: File, maxSize: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height, maxSize);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('이미지를 읽을 수 없습니다')); };
      img.src = objUrl;
    });
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brandId) return;
    setUploading(true); setUploadError('');
    try {
      const base64 = await resizeImage(file, 256);
      const { data } = await uploadLogoFn({ base64, fileName: file.name, contentType: 'image/png' }) as any;
      if (data?.url) setLogoUrl(data.url);
      else setUploadError('업로드 결과를 받지 못했어요. 다시 시도해 주세요.');
    } catch (err) {
      console.error('Logo upload failed:', err);
      setUploadError('로고 업로드에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    if (!brandId || !appName.trim() || saving) return;
    setSaving(true); setSaveState('');
    const { error } = await supabase
      .from('carelaw_brands')
      .update({ app_name: appName.trim(), primary_color: color, logo_url: logoUrl || null })
      .eq('id', brandId);
    setSaving(false);
    if (error) {
      setSaveState('error');
    } else {
      setSaveState('saved');
      setTimeout(() => setSaveState(''), 2400);
    }
  };

  return (
    <div className="p-5 sm:p-8 max-w-lg mx-auto">
      <header className="mb-7">
        <p className="cl-eyebrow mb-1.5">운영 콘솔</p>
        <h1 className="cl-display text-2xl sm:text-3xl">브랜드 설정</h1>
        <hr className="cl-rule-gold w-16 mt-3" />
        <p className="text-ink-soft text-sm mt-3">점주 앱에 보이는 이름과 디자인을 설정합니다.</p>
      </header>

      {/* 미리보기 */}
      <div className="space-y-2 mb-6">
        <p className="cl-label">점주 앱 헤더 미리보기</p>
        <div className="rounded-lg overflow-hidden border border-line shadow-card">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: color }}>
            {logoUrl
              ? <img src={logoUrl} alt="" className="w-6 h-6 rounded-full object-contain bg-white/20 p-0.5" />
              : <span className="w-6 h-6 rounded-full bg-gold flex items-center justify-center text-2xs font-bold text-white">C</span>}
            <span className="font-semibold text-sm text-white">{appName || '앱 이름'}</span>
          </div>
          <div className="bg-paper-sunken px-4 py-2.5 text-2xs text-ink-mute">실제 점주 앱 상단에 이렇게 표시됩니다.</div>
        </div>
      </div>

      {/* 로고 */}
      <div className="space-y-2 mb-6">
        <label className="cl-label">브랜드 로고</label>
        <div className="flex items-center gap-4">
          {logoUrl
            ? <img src={logoUrl} alt="현재 브랜드 로고" className="w-16 h-16 rounded-lg object-contain border border-line bg-paper-sunken p-1 flex-none" />
            : <span className="w-16 h-16 rounded-lg bg-paper-sunken border border-dashed border-line-strong flex items-center justify-center text-ink-mute flex-none" aria-hidden>
                <FaBalanceScale className="text-lg" />
              </span>}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="cl-btn cl-btn-secondary cl-btn-sm"
          >
            <FaUpload className="text-xs" aria-hidden />
            {uploading ? '업로드 중…' : '로고 업로드'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
        </div>
        <p className="text-ink-mute text-xs">정사각형 PNG 권장. 업로드 시 256px 정사각으로 자동 변환됩니다.</p>
        {uploadError && <p role="alert" className="text-danger text-sm">{uploadError}</p>}
      </div>

      {/* 앱 이름 */}
      <div className="space-y-1.5 mb-6">
        <label htmlFor="appName" className="cl-label">앱 이름</label>
        <input
          id="appName"
          value={appName}
          onChange={e => setAppName(e.target.value)}
          placeholder="예: 교촌 법률케어"
          maxLength={20}
          className="cl-input"
        />
        <p className="text-ink-mute text-xs text-right">{appName.length}/20</p>
      </div>

      {/* 컬러 */}
      <div className="space-y-2.5 mb-7">
        <label className="cl-label">브랜드 컬러</label>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(c => {
            const selected = color.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`컬러 ${c}`}
                aria-pressed={selected}
                className={`w-10 h-10 rounded-lg transition-transform ${selected ? 'ring-2 ring-offset-2 ring-ink scale-105' : 'hover:scale-105'}`}
                style={{ background: c }}
              />
            );
          })}
          <label className="w-10 h-10 rounded-lg border border-dashed border-line-strong flex items-center justify-center cursor-pointer text-ink-mute text-lg hover:border-ink-soft">
            +<input type="color" value={color} onChange={e => setColor(e.target.value)} className="sr-only" />
          </label>
        </div>
      </div>

      {/* 저장 */}
      <button
        onClick={save}
        disabled={saving || !appName.trim()}
        className="cl-btn cl-btn-primary cl-btn-lg cl-btn-block"
      >
        {saving ? '저장 중…' : saveState === 'saved' ? <><FaCheckCircle aria-hidden /> 저장했어요</> : '설정 저장'}
      </button>
      {saveState === 'saved' && (
        <p role="status" className="text-success text-sm text-center mt-2.5">변경한 내용이 점주 앱에 반영됐어요.</p>
      )}
      {saveState === 'error' && (
        <p role="alert" className="text-danger text-sm text-center mt-2.5">저장에 실패했어요. 잠시 후 다시 시도해 주세요.</p>
      )}
    </div>
  );
}
