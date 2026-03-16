export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">시스템 설정</h1>
        <p className="text-gray-500 text-sm mt-0.5">케어로 시스템 관리</p>
      </div>

      {/* 시스템 정보 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-bold text-gray-900">시스템 정보</h2>
        <div className="space-y-3 text-sm">
          {[
            ['서비스명', '케어로 (Care-Law)'],
            ['버전', 'v0.1.0 (MVP)'],
            ['운영사', '법률사무소 청송'],
            ['데이터베이스', 'Supabase (PostgreSQL)'],
            ['인증', 'Firebase Auth (이메일+패스워드)'],
            ['AI 엔진', 'Claude (Anthropic)'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-900 font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 관리 작업 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-bold text-gray-900">관리 작업</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Supabase 타입 재생성</p>
              <p className="text-xs text-gray-500">스키마 변경 시 실행</p>
            </div>
            <code className="text-xs bg-gray-200 px-2 py-1 rounded">npx supabase gen types typescript</code>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Functions 배포</p>
              <p className="text-xs text-gray-500">서버 로직 업데이트</p>
            </div>
            <code className="text-xs bg-gray-200 px-2 py-1 rounded">firebase deploy --only functions</code>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">전체 배포</p>
              <p className="text-xs text-gray-500">빌드 + 호스팅 + Functions</p>
            </div>
            <code className="text-xs bg-gray-200 px-2 py-1 rounded">pnpm build:all && firebase deploy</code>
          </div>
        </div>
      </div>

      <p className="text-center text-gray-400 text-xs">
        법률사무소 청송 &middot; jeonwoochul0515@gmail.com
      </p>
    </div>
  );
}
