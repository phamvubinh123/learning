import { Check, ChevronRight, Pencil, Play, Search, StickyNote, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { mergePrinciple } from '../../services/storage';
import type { CertBundle, Principle } from '../../types/cert';
import { BilingualBlock } from '../BilingualBlock';
import { type EditableTarget, NoteEditModal } from '../NoteEditModal';

interface KnowledgeTabProps {
  bundle: CertBundle;
  focusDomainId?: string | null;
  focusPrincipleId?: string | null;
  onPracticeDomain: (domainId: string) => void;
  onPracticePrinciple: (principle: Principle) => void;
}

type FilterKind = 'all' | 'unread' | 'read' | 'noted';

export function KnowledgeTab({
  bundle,
  focusDomainId,
  focusPrincipleId,
  onPracticeDomain,
  onPracticePrinciple,
}: KnowledgeTabProps) {
  const {
    getProgress,
    getOverrides,
    toggleReadPrinciple,
    savePrincipleOverride,
    resetPrincipleOverride,
  } = useApp();

  const slug = bundle.meta.slug;
  const progress = getProgress(slug);
  const overrides = getOverrides(slug);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKind>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [editTarget, setEditTarget] = useState<EditableTarget | null>(null);

  useEffect(() => {
    if (focusDomainId) setSelectedDomain(focusDomainId);
  }, [focusDomainId]);

  useEffect(() => {
    if (focusPrincipleId) {
      setSelectedDomain('ALL');
      setFilter('all');
      setQuery('');
      setTimeout(() => {
        const el = document.getElementById(`principle-${focusPrincipleId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, [focusPrincipleId]);

  const questionCountByPrinciple = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of bundle.questions.questions) {
      for (const pid of q.principles) {
        map[pid] = (map[pid] || 0) + 1;
      }
    }
    return map;
  }, [bundle.questions.questions]);

  const mergedDomains = useMemo(
    () =>
      bundle.knowledge.domains.map((domain) => ({
        ...domain,
        principles: domain.principles.map((p) => mergePrinciple(p, overrides)),
      })),
    [bundle.knowledge.domains, overrides]
  );

  const filteredDomains = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mergedDomains
      .filter((d) => selectedDomain === 'ALL' || d.id === selectedDomain)
      .map((d) => ({
        ...d,
        principles: d.principles.filter((p) => {
          const isRead = Boolean(progress.readPrinciples[p.id]);
          const hasNoteOrEdit = Boolean(p.personal_notes?.trim() || overrides.principles[p.id]);
          if (filter === 'read' && !isRead) return false;
          if (filter === 'unread' && isRead) return false;
          if (filter === 'noted' && !hasNoteOrEdit) return false;
          if (!q) return true;
          const haystack = `${p.id} ${p.title.en} ${p.title.vi} ${p.body.en} ${p.body.vi} ${p.personal_notes || ''}`.toLowerCase();
          return haystack.includes(q);
        }),
      }))
      .filter((d) => d.principles.length > 0);
  }, [mergedDomains, selectedDomain, filter, query, progress.readPrinciples, overrides.principles]);

  const totalVisible = filteredDomains.reduce((sum, d) => sum + d.principles.length, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
      <aside className="min-w-0 lg:sticky lg:top-32 lg:self-start">
        <div className="surface-card p-3 sm:p-3.5">
          <div className="px-1.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Danh mục Domain
          </div>
          <nav className="flex w-full gap-1.5 overflow-x-auto pb-0.5 lg:flex-col lg:overflow-visible lg:pb-0 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedDomain('ALL')}
              className={`flex shrink-0 items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition cursor-pointer ${
                selectedDomain === 'ALL'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'bg-[var(--bg-subtle)]/70 text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] lg:bg-transparent'
              }`}
            >
              <span>Tất cả</span>
              <span className="ml-1.5 font-mono text-[11px]">{bundle.meta.stats.principles}</span>
            </button>

            {mergedDomains.map((d) => {
              const read = d.principles.filter((p) => progress.readPrinciples[p.id]).length;
              const active = selectedDomain === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDomain(d.id)}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition cursor-pointer ${
                    active
                      ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent-ink)]'
                      : 'bg-[var(--bg-subtle)]/70 text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] lg:bg-transparent'
                  }`}
                >
                  <span className="max-w-[175px] truncate lg:max-w-none">
                    <span className="font-mono font-bold">{d.id}</span> · {d.name.en}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] opacity-80">
                    {read}/{d.principles.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm nguyên tắc, từ khóa hoặc ghi chú cá nhân..."
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] py-2 pl-10 pr-3.5 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', 'Tất cả'],
                ['unread', 'Chưa hiểu'],
                ['read', 'Đã hiểu'],
                ['noted', 'Có ghi chú'],
              ] as [FilterKind, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilter(val)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  filter === val
                    ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]'
                    : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {totalVisible === 0 ? (
          <div className="surface-card p-10 text-center">
            <p className="text-sm font-semibold">Không tìm thấy nguyên tắc phù hợp.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFilter('all');
                setSelectedDomain('ALL');
              }}
              className="mt-3 text-xs font-semibold text-[var(--accent-ink)] hover:underline cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          filteredDomains.map((domain) => {
            const readInDomain = domain.principles.filter((p) => progress.readPrinciples[p.id]).length;
            const domainPct = domain.principles.length
              ? Math.round((readInDomain / domain.principles.length) * 100)
              : 0;

            return (
              <section key={domain.id} className="space-y-4">
                <div className="surface-subtle flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                      <span>{domain.code}</span>
                      <span>·</span>
                      <span className="font-mono">{domain.weight}% đề thi</span>
                      <span>·</span>
                      <span className="font-mono text-[var(--ink-muted)]">
                        {readInDomain}/{domain.principles.length} ({domainPct}%)
                      </span>
                    </div>
                    <h2 className="mt-1 text-xl font-bold">{domain.name.en}</h2>
                    {domain.description.vi && (
                      <div className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--ink-secondary)]">
                        <BilingualBlock text={domain.description} inline />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onPracticeDomain(domain.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-[13px] font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent-ink)] sm:self-center cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Luyện {domain.id}</span>
                  </button>
                </div>

                <div className="space-y-3.5">
                  {domain.principles.map((principle) => {
                    const isRead = Boolean(progress.readPrinciples[principle.id]);
                    const hasOverride = Boolean(overrides.principles[principle.id]);
                    const linkedQuestions = questionCountByPrinciple[principle.id] || principle.questionCount || 0;

                    return (
                      <article
                        key={principle.id}
                        id={`principle-${principle.id}`}
                        className={`surface-card p-4 transition sm:p-6 ${
                          isRead ? 'border-l-4 border-l-[var(--success)]' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3.5">
                          <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)] font-mono text-xs font-bold text-[var(--ink-secondary)] sm:mt-0.5 sm:flex">
                            {principle.number}
                          </span>

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-md bg-[var(--bg-subtle)] px-1.5 font-mono text-xs font-bold text-[var(--ink-secondary)] sm:hidden">
                                  {principle.number}
                                </span>
                                <h3 className="text-[17px] font-bold leading-snug sm:text-[18px]">
                                  <BilingualBlock text={principle.title} inline />
                                </h3>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] text-[var(--ink-muted)]">#{principle.id}</span>
                                {hasOverride && (
                                  <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-ink)]">
                                    Edited
                                  </span>
                                )}
                              </div>
                            </div>

                            <BilingualBlock
                              text={principle.body}
                              primaryClassName="reading-prose"
                              secondaryClassName="reading-prose-secondary"
                            />

                            {principle.personal_notes && (
                              <div className="rounded-xl border border-[var(--warn)]/35 bg-[var(--warn-soft)] px-4 py-3 text-sm">
                                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--warn)]">
                                  <StickyNote className="h-3.5 w-3.5" />
                                  <span>Ghi chú cá nhân</span>
                                </div>
                                <p className="whitespace-pre-wrap text-[var(--ink-primary)]">{principle.personal_notes}</p>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-3.5">
                              <button
                                type="button"
                                onClick={() => toggleReadPrinciple(slug, principle.id)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                  isRead
                                    ? 'bg-[var(--success-soft)] text-[var(--success)]'
                                    : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)]'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>{isRead ? 'Đã hiểu' : 'Đánh dấu đã hiểu'}</span>
                              </button>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditTarget({ kind: 'principle', item: principle, hasOverride })}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>{principle.personal_notes ? 'Sửa ghi chú' : 'Edit / Add Note'}</span>
                                </button>

                                {linkedQuestions > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => onPracticePrinciple(principle)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)] transition hover:opacity-85 cursor-pointer"
                                  >
                                    <Target className="h-3.5 w-3.5" />
                                    <span>Luyện tập ({linkedQuestions} câu)</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      <NoteEditModal
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSavePrinciple={(id, payload) => savePrincipleOverride(slug, id, payload)}
        onResetPrinciple={(id) => resetPrincipleOverride(slug, id)}
      />
    </div>
  );
}
