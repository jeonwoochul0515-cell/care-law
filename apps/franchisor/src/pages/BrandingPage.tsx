// BrandingPage.tsx
import { useEffect, useState, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { supabase, functions } from '@care-law/shared';
import { useAuthStore } from '../store/authStore';
import { FaUpload, FaSave, FaCheckCircle } from 'react-icons/fa';

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
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    if (!brandId) return;
    supabase.from('carelaw_brands').select('*').eq('id', brandId).single().then(({ data }) => {
      if (!data) return;
      setAppName(data.app_name); setColor(data.primary_color); setLogoUrl(data.logo_url ?? '');
    });
  }, [brandId]);

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brandId) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const { data } = await uploadLogoFn({ base64, fileName: file.name, contentType: file.type }) as any;
      if (data?.url) setLogoUrl(data.url);
    } catch (err) {
      console.error('Logo upload failed:', err);
    }
    setUploading(false);
  };

  const save = async () => {
    if (!brandId || !appName.trim()) return;
    setSaving(true);
    await supabase.from('carelaw_brands').update({ app_name: appName.trim(), primary_color: color, logo_url: logoUrl || null }).eq('id', brandId);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">브랜드 설정</h1>
        <p className="text-gray-500 text-sm mt-0.5">점주에게 보이는 앱 이름과 디자인을 설정합니다</p>
      </div>

      {/* 미리보기 */}
      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="px-4 py-3 text-white flex items-center gap-2" style={{ background: color }}>
          {logoUrl ? <img src={logoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
            : <div className="w-6 h-6 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold text-[#1E2D4E]">C</div>}
          <span className="font-bold text-sm text-[#C9A84C]">{appName || '앱 이름'}</span>
        </div>
        <div className="bg-gray-50 px-4 py-3 text-xs text-gray-400">↑ 점주 앱 헤더 미리보기</div>
      </div>

      {/* 로고 */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">브랜드 로고</label>
        <div className="flex items-center gap-4">
          {logoUrl ? <img src={logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
            : <div className="w-16 h-16 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">미설정</div>}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 disabled:opacity-50">
            <FaUpload className="text-gray-400 text-xs" />
            {uploading ? '업로드 중...' : '로고 업로드'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
        </div>
      </div>

      {/* 앱 이름 */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">앱 이름</label>
        <input value={appName} onChange={e => setAppName(e.target.value)} placeholder="예: 교촌 법률케어"
               maxLength={20}
               className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400" />
        <p className="text-gray-400 text-xs text-right">{appName.length}/20</p>
      </div>

      {/* 컬러 */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">브랜드 컬러</label>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(c => (
            <button key={c} onClick={() => setColor(c)}
                    className="w-10 h-10 rounded-xl border-2 transition-all"
                    style={{ background: c, borderColor: color === c ? '#000' : 'transparent' }} />
          ))}
          <label className="w-10 h-10 rounded-xl border border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-gray-400 text-xs">
            + <input type="color" value={color} onChange={e => setColor(e.target.value)} className="sr-only" />
          </label>
        </div>
      </div>

      <button onClick={save} disabled={saving || !appName.trim()}
              className="w-full bg-[#1E2D4E] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50">
        {saved ? <><FaCheckCircle className="text-green-400" /> 저장 완료!</>
          : saving ? '저장 중...' : <><FaSave className="text-[#C9A84C]" /> 설정 저장</>}
      </button>
    </div>
  );
}
