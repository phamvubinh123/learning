import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { assetUrl } from '../services/dataLoader';
import { BilingualBlock } from './BilingualBlock';

interface HomeCatalogProps {
  onSelectCert: (slug: string) => void;
}

export function HomeCatalog({ onSelectCert }: HomeCatalogProps) {
  const { catalog, catalogLoading, catalogError, getProgress } = useApp();

  if (catalogLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="surface-card h-56 animate-pulse bg-[var(--bg-subtle)]/50 p-6" />
          ))}
        </div>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <div className="surface-card p-8">
          <AlertCircle className="mx-auto h-10 w-10 text-[var(--danger)]" />
          <h2 className="mt-3 text-lg font-bold">Chưa tải được danh mục chứng chỉ</h2>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">{catalogError}</p>
        </div>
      </div>
    );
  }

  const totalQuestions = catalog.reduce((sum, c) => sum + c.stats.questions, 0);
  const totalPrinciples = catalog.reduce((sum, c) => sum + c.stats.principles, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="max-w-3xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--accent-ink)]">
          Personal Certification Study Workspace
        </p>
        <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Không gian tự học chứng chỉ song ngữ & luyện thi cá nhân hóa
        </h1>
        <p className="mt-3.5 text-base leading-relaxed text-[var(--ink-secondary)]">
          Học sâu theo từng Domain, tra cứu Cheatsheet & Glossary, thi thử bấm giờ theo đúng tỷ trọng đề thật,
          luyện kho câu sai và lưu ghi chú cá nhân trực tiếp trên thiết bị của bạn.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-[var(--accent-ink)]" />
            {catalog.length} chứng chỉ
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-ink)]" />
            {totalPrinciples} nguyên tắc kiến thức
          </span>
          <span className="inline-flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--accent-ink)]" />
            {totalQuestions.toLocaleString()} câu hỏi song ngữ EN–VI
          </span>
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        {catalog.map((cert) => {
          const progress = getProgress(cert.slug);
          const readCount = Object.values(progress.readPrinciples).filter(Boolean).length;
          const readPct = cert.stats.principles ? Math.round((readCount / cert.stats.principles) * 100) : 0;
          const weakCount = Object.values(progress.questionStats).filter(
            (s) => s.wrongCount > 0 && !s.resolvedWeakSpot
          ).length;

          return (
            <button
              key={cert.slug}
              type="button"
              onClick={() => onSelectCert(cert.slug)}
              className="surface-card group flex flex-col justify-between p-6 text-left transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-md cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {cert.badge ? (
                      <img
                        src={assetUrl(cert.badge)}
                        alt={cert.code}
                        className="h-14 w-14 shrink-0 rounded-xl bg-[var(--bg-subtle)] p-1.5 object-contain"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-subtle)] font-mono text-sm font-bold">
                        {cert.code}
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                          {cert.code}
                        </span>
                        <span className="text-xs text-[var(--ink-muted)]">· {cert.provider}</span>
                      </div>
                      <h2 className="mt-0.5 text-lg font-bold leading-snug group-hover:text-[var(--accent-ink)] transition">
                        {cert.name.en}
                      </h2>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[var(--ink-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--accent-ink)]" />
                </div>

                {cert.tagline?.vi && (
                  <div className="mt-3.5 line-clamp-2 text-sm text-[var(--ink-secondary)]">
                    <BilingualBlock text={cert.tagline} inline />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1 font-medium text-[var(--ink-secondary)]">
                    {cert.stats.domains} Domains
                  </span>
                  <span className="rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1 font-medium text-[var(--ink-secondary)]">
                    {cert.stats.principles} nguyên tắc
                  </span>
                  <span className="rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1 font-medium text-[var(--ink-secondary)]">
                    {cert.stats.questions} câu hỏi
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1 font-medium text-[var(--ink-secondary)]">
                    <Clock className="h-3 w-3" />
                    {cert.examConfig.totalQuestions}Q / {cert.examConfig.durationMinutes}p
                  </span>
                  {weakCount > 0 && (
                    <span className="rounded-lg bg-[var(--danger-soft)] px-2.5 py-1 font-semibold text-[var(--danger)]">
                      {weakCount} câu sai cần ôn
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--border-hairline)] pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--ink-secondary)]">
                    Tiến độ kiến thức: {readCount}/{cert.stats.principles}
                  </span>
                  <span className="font-mono font-semibold text-[var(--accent-ink)]">{readPct}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${readPct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </section>
    </main>
  );
}
