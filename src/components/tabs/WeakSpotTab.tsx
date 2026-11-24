import { AlertTriangle, CheckCircle2, Play, RotateCcw, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { mergeQuestion } from '../../services/storage';
import type { CertBundle } from '../../types/cert';
import { type EditableTarget, NoteEditModal } from '../NoteEditModal';
import { QuestionCard } from '../QuestionCard';

interface WeakSpotTabProps {
  bundle: CertBundle;
  onStartWeakSpotDrill: () => void;
  onJumpPrinciple: (principleId: string) => void;
}

export function WeakSpotTab({ bundle, onStartWeakSpotDrill, onJumpPrinciple }: WeakSpotTabProps) {
  const {
    getProgress,
    getOverrides,
    setWeakSpotResolved,
    saveQuestionOverride,
    resetQuestionOverride,
  } = useApp();

  const slug = bundle.meta.slug;
  const progress = getProgress(slug);
  const overrides = getOverrides(slug);

  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [showResolved, setShowResolved] = useState(false);
  const [query, setQuery] = useState('');
  const [editTarget, setEditTarget] = useState<EditableTarget | null>(null);

  const caseMap = useMemo(() => new Map(bundle.questions.cases.map((c) => [c.id, c])), [bundle.questions.cases]);

  const allWrongEntries = useMemo(
    () =>
      bundle.questions.questions
        .filter((q) => (progress.questionStats[q.uid]?.wrongCount || 0) > 0)
        .map((q) => ({ question: mergeQuestion(q, overrides), stat: progress.questionStats[q.uid] }))
        .sort((a, b) => b.stat.wrongCount - a.stat.wrongCount),
    [bundle.questions.questions, progress.questionStats, overrides]
  );

  const activeWrongEntries = useMemo(
    () => allWrongEntries.filter((e) => !e.stat.resolvedWeakSpot),
    [allWrongEntries]
  );

  const resolvedCount = allWrongEntries.length - activeWrongEntries.length;

  const domainCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of activeWrongEntries) map[e.question.domain] = (map[e.question.domain] || 0) + 1;
    return map;
  }, [activeWrongEntries]);

  const visibleEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allWrongEntries.filter(({ question, stat }) => {
      if (!showResolved && stat.resolvedWeakSpot) return false;
      if (domainFilter !== 'ALL' && question.domain !== domainFilter) return false;
      if (!q) return true;
      return `${question.uid} ${question.question.en} ${question.question.vi} ${question.explanation.en} ${question.explanation.vi} ${question.personal_notes || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [allWrongEntries, showResolved, domainFilter, query]);

  if (allWrongEntries.length === 0) {
    return (
      <div className="surface-card p-10 text-center sm:p-14">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold">Kho câu sai đang trống!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--ink-secondary)]">
          Bất kỳ câu nào bạn trả lời sai trong chế độ Thi thử hoặc Luyện theo Domain sẽ tự động được gom về đây để bạn ghi chú nguyên nhân sai và luyện lại cho đến khi thành thạo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface-card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--danger)]">
            <AlertTriangle className="h-4 w-4" />
            <span>Weak-Spot Drill</span>
          </div>
          <h2 className="mt-1.5 text-2xl font-bold">{activeWrongEntries.length} câu sai cần khắc phục</h2>
          <p className="mt-1 text-sm text-[var(--ink-secondary)]">
            Ôn lại giải thích song ngữ, ghi chú lý do bẫy vào{' '}
            <code className="font-mono text-xs">personal_notes</code>, hoặc luyện lại toàn bộ kho câu sai ngay.
            {resolvedCount > 0 && ` (Đã khắc phục: ${resolvedCount} câu)`}
          </p>
        </div>

        <button
          type="button"
          disabled={activeWrongEntries.length === 0}
          onClick={onStartWeakSpotDrill}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-40 dark:text-[#0f1115] cursor-pointer disabled:cursor-not-allowed"
        >
          <Play className="h-4 w-4" />
          <span>Luyện lại {activeWrongEntries.length} câu sai</span>
        </button>
      </section>

      <div className="surface-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDomainFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              domainFilter === 'ALL' ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]' : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
            }`}
          >
            Tất cả ({activeWrongEntries.length})
          </button>
          {bundle.meta.domains.map((d) => {
            const count = domainCounts[d.id] || 0;
            if (!count && domainFilter !== d.id) return null;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDomainFilter(d.id)}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition cursor-pointer ${
                  domainFilter === d.id ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]' : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                }`}
              >
                {d.id} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-3 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm trong kho câu sai..."
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] py-1.5 pl-9 pr-3 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          {resolvedCount > 0 && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span>Hiện đã khắc phục ({resolvedCount})</span>
            </label>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {visibleEntries.length === 0 ? (
          <div className="surface-card p-8 text-center text-sm text-[var(--ink-muted)]">
            Không có câu sai nào trong bộ lọc này.
          </div>
        ) : (
          visibleEntries.map(({ question, stat }) => (
            <div key={question.uid} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[var(--danger-soft)] px-2 py-0.5 font-mono font-bold text-[var(--danger)]">
                    Sai {stat.wrongCount} lần / {stat.attempts} lượt
                  </span>
                  {stat.resolvedWeakSpot && (
                    <span className="rounded-md bg-[var(--success-soft)] px-2 py-0.5 font-semibold text-[var(--success)]">
                      Đã khắc phục
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setWeakSpotResolved(slug, question.uid, !stat.resolvedWeakSpot)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    stat.resolvedWeakSpot
                      ? 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)]'
                      : 'bg-[var(--success-soft)] text-[var(--success)] hover:opacity-85'
                  }`}
                >
                  {stat.resolvedWeakSpot ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Đưa lại vào kho ôn</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Đánh dấu đã khắc phục</span>
                    </>
                  )}
                </button>
              </div>

              <QuestionCard
                question={question}
                caseStudy={question.caseId ? caseMap.get(question.caseId) : undefined}
                answer={undefined}
                revealAnswer={true}
                hasOverride={Boolean(overrides.questions[question.uid])}
                onEditNote={() =>
                  setEditTarget({ kind: 'question', item: question, hasOverride: Boolean(overrides.questions[question.uid]) })
                }
                onJumpPrinciple={onJumpPrinciple}
              />
            </div>
          ))
        )}
      </div>

      <NoteEditModal
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaveQuestion={(uid, payload) => saveQuestionOverride(slug, uid, payload)}
        onResetQuestion={(uid) => resetQuestionOverride(slug, uid)}
      />
    </div>
  );
}
