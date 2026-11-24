import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Layers,
  Target,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { assetUrl } from '../../services/dataLoader';
import { getWeakSpotQuestions } from '../../services/examEngine';
import type { CertBundle, CertTab } from '../../types/cert';
import { BilingualBlock } from '../BilingualBlock';

interface OverviewTabProps {
  bundle: CertBundle;
  onNavigateTab: (tab: CertTab, opts?: { domainId?: string; autoStartMode?: 'mock' | 'domain' | 'weakspots' }) => void;
}

const DOMAIN_COLORS = ['#0d9488', '#0284c7', '#d97706', '#e11d48', '#4f46e5', '#059669', '#ea580c'];

export function OverviewTab({ bundle, onNavigateTab }: OverviewTabProps) {
  const { getProgress } = useApp();
  const { meta, knowledge, questions } = bundle;
  const progress = getProgress(meta.slug);

  const totalPrinciples = knowledge.domains.reduce((s, d) => s + d.principles.length, 0);
  const readPrinciples = knowledge.domains.reduce(
    (s, d) => s + d.principles.filter((p) => progress.readPrinciples[p.id]).length,
    0
  );
  const readPct = totalPrinciples ? Math.round((readPrinciples / totalPrinciples) * 100) : 0;

  const statsList = Object.values(progress.questionStats);
  const practicedQuestions = statsList.length;
  const totalAttempts = statsList.reduce((s, q) => s + q.attempts, 0);
  const totalCorrect = statsList.reduce((s, q) => s + q.correctCount, 0);
  const accuracyPct = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const weakSpotsCount = getWeakSpotQuestions(questions.questions, progress).length;

  const totalWeight = meta.domains.reduce((s, d) => s + d.weight, 0) || 100;

  return (
    <div className="space-y-8">
      <section className="surface-card p-5 sm:p-8">
        <div className="space-y-4">
          <div className="flex items-start gap-3.5 sm:gap-4">
            {meta.badge && (
              <img
                src={assetUrl(meta.badge)}
                alt={meta.code}
                className="h-14 w-14 shrink-0 rounded-2xl bg-[var(--bg-subtle)] p-1.5 object-contain sm:h-20 sm:w-20 sm:p-2"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold sm:gap-2">
                <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[var(--accent-ink)]">
                  {meta.code}
                </span>
                <span className="text-[var(--ink-muted)]">{meta.provider}</span>
                <span className="text-[var(--ink-muted)]">·</span>
                <span className="text-[var(--ink-muted)]">{meta.category}</span>
              </div>
              <h1 className="mt-1.5 text-xl font-extrabold leading-snug tracking-tight sm:text-3xl">
                {meta.name.en}
              </h1>
            </div>
          </div>
          {meta.guide?.intro?.vi && (
            <div className="max-w-3xl">
              <BilingualBlock
                text={meta.guide.intro}
                primaryClassName="reading-prose text-[15.5px]"
                secondaryClassName="text-[15px]"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('knowledge')}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] dark:text-[#0f1115] cursor-pointer"
          >
            <BookOpen className="h-4 w-4" />
            <span>{readPrinciples > 0 ? 'Tiếp tục học kiến thức' : 'Bắt đầu học kiến thức'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('exam', { autoStartMode: 'mock' })}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <ClipboardCheck className="h-4 w-4 text-[var(--accent-ink)]" />
            <span>Thi thử Full Mock ({meta.examConfig.totalQuestions} câu)</span>
          </button>
          {weakSpotsCount > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab('weakspots')}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--danger)]/35 bg-[var(--danger-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition hover:opacity-90 cursor-pointer"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Ôn {weakSpotsCount} câu sai</span>
            </button>
          )}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 border-t border-[var(--border-hairline)] pt-6 lg:grid-cols-4">
          <div className="surface-subtle p-4">
            <div className="flex items-center justify-between text-[13px] font-medium text-[var(--ink-muted)]">
              <span>Kiến thức đã hiểu</span>
              <CheckCircle2 className="h-4 w-4 text-[var(--accent-ink)]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold">{readPct}%</span>
              <span className="text-[13px] text-[var(--ink-muted)]">{readPrinciples}/{totalPrinciples}</span>
            </div>
          </div>

          <div className="surface-subtle p-4">
            <div className="flex items-center justify-between text-[13px] font-medium text-[var(--ink-muted)]">
              <span>Câu hỏi đã luyện</span>
              <Layers className="h-4 w-4 text-[var(--accent-ink)]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold">{practicedQuestions}</span>
              <span className="text-[13px] text-[var(--ink-muted)]">/ {questions.totalCount}</span>
            </div>
          </div>

          <div className="surface-subtle p-4">
            <div className="flex items-center justify-between text-[13px] font-medium text-[var(--ink-muted)]">
              <span>Độ chính xác</span>
              <Target className="h-4 w-4 text-[var(--accent-ink)]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold">{totalAttempts ? `${accuracyPct}%` : '—'}</span>
              <span className="text-[13px] text-[var(--ink-muted)]">{progress.examHistory.length} lượt thi</span>
            </div>
          </div>

          <div className="surface-subtle p-4">
            <div className="flex items-center justify-between text-[13px] font-medium text-[var(--ink-muted)]">
              <span>Kho câu sai</span>
              <AlertTriangle className={`h-4 w-4 ${weakSpotsCount > 0 ? 'text-[var(--danger)]' : 'text-[var(--ink-muted)]'}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`font-mono text-2xl font-bold ${weakSpotsCount > 0 ? 'text-[var(--danger)]' : ''}`}>
                {weakSpotsCount}
              </span>
              <span className="text-[13px] text-[var(--ink-muted)]">cần khắc phục</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Tỷ trọng Domain & Tiến độ ôn tập</h2>
          <p className="mt-1 text-[14.5px] leading-relaxed text-[var(--ink-secondary)]">
            Ưu tiên học các domain chiếm tỷ trọng cao trước. Bấm vào từng domain để học hoặc luyện đề riêng.
          </p>
        </div>

        <div className="surface-card p-4 sm:p-5">
          <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
            {meta.domains.map((d, idx) => (
              <div
                key={d.id}
                title={`${d.id}: ${d.name.en} (${d.weight}%)`}
                style={{
                  width: `${(d.weight / totalWeight) * 100}%`,
                  backgroundColor: DOMAIN_COLORS[idx % DOMAIN_COLORS.length],
                }}
                className="h-full border-r border-[var(--bg-surface)] last:border-r-0"
              />
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {knowledge.domains.map((domain, idx) => {
              const color = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
              const domainRead = domain.principles.filter((p) => progress.readPrinciples[p.id]).length;
              const domainPct = domain.principles.length
                ? Math.round((domainRead / domain.principles.length) * 100)
                : 0;
              const domainQuestions = questions.questions.filter((q) => q.domain === domain.id);
              const domainAnswered = domainQuestions.filter((q) => progress.questionStats[q.uid]);
              const domainCorrect = domainAnswered.filter((q) => progress.questionStats[q.uid]?.lastCorrect);

              return (
                <div
                  key={domain.id}
                  className="flex flex-col justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 p-4 sm:p-5 transition hover:border-[var(--border-strong)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="font-mono text-[13px] font-bold uppercase text-[var(--ink-muted)]">
                          {domain.id}
                        </span>
                      </div>
                      <span className="font-mono text-xl font-extrabold" style={{ color }}>
                        {domain.weight}%
                      </span>
                    </div>

                    <h3 className="mt-2 text-[17px] font-bold leading-snug sm:text-lg">{domain.name.en}</h3>
                    {domain.description.vi && (
                      <div className="mt-2 text-[14.5px] leading-relaxed text-[var(--ink-secondary)]">
                        <BilingualBlock
                          text={domain.description}
                          primaryClassName="text-[14.5px] leading-[1.65]"
                          secondaryClassName="text-[14px] leading-[1.65]"
                          inline
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-3">
                    <div>
                      <div className="flex justify-between text-[13px] font-medium text-[var(--ink-secondary)]">
                        <span>Kiến thức: {domainRead}/{domain.principles.length} nguyên tắc</span>
                        <span className="font-mono font-semibold">{domainPct}%</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${domainPct}%`, backgroundColor: color }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 text-sm">
                      <span className="text-[13.5px] font-medium text-[var(--ink-muted)]">
                        Đề: {domainQuestions.length} câu
                        {domainAnswered.length > 0 && ` · Đúng ${domainCorrect.length}/${domainAnswered.length}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigateTab('knowledge', { domainId: domain.id })}
                          className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1.5 text-[13.5px] font-semibold text-[var(--ink-primary)] hover:border-[var(--border-strong)] cursor-pointer"
                        >
                          Học
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('exam', { domainId: domain.id, autoStartMode: 'domain' })}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-[13.5px] font-semibold text-[var(--accent-ink)] hover:opacity-85 cursor-pointer"
                        >
                          Luyện đề
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {meta.examFacts.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Cấu trúc bài thi chính thức</h2>
            {meta.factsSource && (
              <a
                href={meta.factsSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--ink-muted)] hover:text-[var(--accent-ink)]"
              >
                <span>Nguồn: {meta.factsSource.label}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {meta.examFacts.map((fact, idx) => (
              <div key={idx} className="surface-card p-4 sm:p-5">
                <div className="text-[12.5px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                  <BilingualBlock text={fact.label} inline />
                </div>
                <div className="mt-1.5 font-[var(--font-display)] text-xl font-extrabold">
                  <BilingualBlock text={fact.value} inline />
                </div>
                {fact.detail.vi && (
                  <div className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
                    <BilingualBlock text={fact.detail} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {meta.studyPlan.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Lộ trình ôn thi đề xuất</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {meta.studyPlan.map((phase, idx) => (
              <div key={idx} className="surface-card p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-[var(--accent-soft)] px-2.5 py-0.5 font-mono text-xs font-bold text-[var(--accent-ink)]">
                    {phase.phase}
                  </span>
                  <span className="font-mono text-xs text-[var(--ink-muted)]">
                    0{idx + 1}/0{meta.studyPlan.length}
                  </span>
                </div>
                <h3 className="mt-2.5 text-[17px] font-bold">
                  <BilingualBlock text={phase.title} inline />
                </h3>
                <ul className="mt-3.5 space-y-3">
                  {phase.steps.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2.5">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      <BilingualBlock
                        text={step}
                        primaryClassName="text-[14.5px] leading-relaxed"
                        secondaryClassName="text-[14px]"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {meta.faqs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Câu hỏi thường gặp</h2>
          <div className="surface-card divide-y divide-[var(--border-hairline)] overflow-hidden">
            {meta.faqs.map((faq, idx) => (
              <details key={idx} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[15px] leading-snug">
                  <BilingualBlock text={faq.question} inline />
                  <span className="font-mono text-lg text-[var(--ink-muted)] transition group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3 text-[15px] text-[var(--ink-secondary)]">
                  <BilingualBlock text={faq.answer} primaryClassName="leading-relaxed" />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
