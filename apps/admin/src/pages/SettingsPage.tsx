// 시스템 설정 — 서비스 정보 및 운영 명령어 안내
export default function SettingsPage() {
  const info: [string, string][] = [
    ['서비스명', '케어로 (Care-Law)'],
    ['버전', 'v0.1.0 (MVP)'],
    ['운영사', '법률사무소 청송'],
    ['데이터베이스', 'Supabase (PostgreSQL)'],
    ['인증', 'Firebase Auth (이메일·비밀번호)'],
    ['AI 엔진', 'Claude (Anthropic)'],
  ];

  const tasks: [string, string, string][] = [
    ['Supabase 타입 재생성', '스키마를 변경했을 때 실행', 'npx supabase gen types typescript'],
    ['Functions 배포', '서버 로직을 업데이트할 때', 'firebase deploy --only functions'],
    ['전체 배포', '빌드 · 호스팅 · Functions 한 번에', 'pnpm build:all && firebase deploy'],
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-5 md:p-8">
      <header>
        <p className="cl-eyebrow cl-eyebrow-gold">운영 콘솔</p>
        <h1 className="cl-display mt-1 text-2xl md:text-3xl">시스템 설정</h1>
        <hr className="cl-rule-gold mt-3 w-12" />
        <p className="mt-2 text-sm text-ink-soft">케어로 시스템 정보와 운영 명령어</p>
      </header>

      {/* 시스템 정보 */}
      <section className="cl-card p-6">
        <h2 className="font-semibold text-ink">시스템 정보</h2>
        <dl className="mt-4 divide-y divide-line">
          {info.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-sm text-ink-mute">{label}</dt>
              <dd className="text-sm font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 관리 작업 */}
      <section className="cl-card p-6">
        <h2 className="font-semibold text-ink">운영 명령어</h2>
        <div className="mt-4 space-y-3">
          {tasks.map(([title, desc, cmd]) => (
            <div key={title} className="cl-card-sunken p-4">
              <p className="text-sm font-medium text-ink">{title}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{desc}</p>
              <code className="mt-2 block overflow-x-auto rounded-md bg-paper-raised px-3 py-2 text-xs text-ink-soft">{cmd}</code>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-ink-mute">
        법률사무소 청송 · jeonwoochul0515@gmail.com
      </p>
    </div>
  );
}
