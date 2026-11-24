import { Check, ChevronDown, ChevronRight, ListTree, Pencil, Play, Search, StickyNote, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { mergePrinciple } from '../../services/storage';
import type { CertBundle, Principle } from '../../types/cert';
import { BilingualBlock, pickText } from '../BilingualBlock';
import { type EditableTarget, NoteEditModal } from '../NoteEditModal';

const DOMAIN_COLORS = ['#0d9488', '#0284c7', '#d97706', '#e11d48', '#4f46e5', '#059669', '#ea580c'];

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
    languageMode,
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
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>(() => {
    const firstId = bundle.knowledge.domains[0]?.id;
    return firstId ? { [firstId]: true } : {};
  });
  const [activePrincipleId, setActivePrincipleId] = useState<string | null>(null);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditableTarget | null>(null);
  const isManualJumpRef = useMemo(() => ({ current: false }), []);

  useEffect(() => {
    if (focusDomainId) {
      setSelectedDomain(focusDomainId);
      setExpandedDomains({ [focusDomainId]: true });
    }
  }, [focusDomainId]);

  useEffect(() => {
    if (focusPrincipleId) {
      setSelectedDomain('ALL');
      setFilter('all');
      setQuery('');
      setActivePrincipleId(focusPrincipleId);
      const ownerDomain = bundle.knowledge.domains.find((d) =>
        d.principles.some((p) => p.id === focusPrincipleId)
      );
      if (ownerDomain) {
        setExpandedDomains({ [ownerDomain.id]: true });
      }
      setTimeout(() => {
        const el = document.getElementById(`principle-${focusPrincipleId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, [focusPrincipleId, bundle.knowledge.domains]);

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

  // Scroll-spy: automatically track visible principle & expand its domain while scrolling
  useEffect(() => {
    const principleElements = Array.from(
      document.querySelectorAll<HTMLElement>('article[data-principle-id]')
    );
    if (!principleElements.length) return;

    const visibleMap = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualJumpRef.current) return;

        for (const entry of entries) {
          const pid = entry.target.getAttribute('data-principle-id');
          if (!pid) continue;
          if (entry.isIntersecting) {
            visibleMap.set(pid, entry.boundingClientRect.top);
          } else {
            visibleMap.delete(pid);
          }
        }

        if (visibleMap.size === 0) return;

        // Pick the topmost visible principle near the reading header
        let bestId: string | null = null;
        let bestScore = Infinity;
        for (const [pid, top] of visibleMap.entries()) {
          const dist = Math.abs(top - 140);
          if (dist < bestScore) {
            bestScore = dist;
            bestId = pid;
          }
        }

        if (bestId) {
          setActivePrincipleId(bestId);
          const ownerEl = document.querySelector<HTMLElement>(`article[data-principle-id="${bestId}"]`);
          const domId = ownerEl?.getAttribute('data-domain-id');
          if (domId) {
            setExpandedDomains((prev) => {
              const activeKeys = Object.keys(prev).filter((k) => prev[k]);
              if (activeKeys.length === 1 && activeKeys[0] === domId) return prev;
              return { [domId]: true };
            });
          }
          // Keep active item visible inside desktop sidebar scroll area
          const navBtn = document.querySelector<HTMLElement>(`[data-nav-principle="${bestId}"]`);
          navBtn?.scrollIntoView({ block: 'nearest' });
        }
      },
      {
        rootMargin: '-120px 0px -55% 0px',
        threshold: [0, 0.25, 0.6],
      }
    );

    for (const el of principleElements) observer.observe(el);
    return () => observer.disconnect();
  }, [filteredDomains, isManualJumpRef]);

  const totalVisible = filteredDomains.reduce((sum, d) => sum + d.principles.length, 0);
  const totalReadAll = mergedDomains.reduce(
    (sum, d) => sum + d.principles.filter((p) => progress.readPrinciples[p.id]).length,
    0
  );

  const handleDomainClick = (domainId: string) => {
    setSelectedDomain(domainId);
    setExpandedDomains((prev) =>
      selectedDomain === domainId && prev[domainId] ? {} : { [domainId]: true }
    );
  };

  const handlePrincipleJump = (domainId: string, principleId: string) => {
    isManualJumpRef.current = true;
    setActivePrincipleId(principleId);
    setMobileTocOpen(false);
    if (selectedDomain !== 'ALL' && selectedDomain !== domainId) {
      setSelectedDomain(domainId);
    }
    if (filter !== 'all' || query) {
      setFilter('all');
      setQuery('');
    }
    setTimeout(() => {
      const el = document.getElementById(`principle-${principleId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isManualJumpRef.current = false;
      }, 600);
    }, 80);
  };

  const renderDomainTree = () => (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setSelectedDomain('ALL')}
        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition cursor-pointer ${
          selectedDomain === 'ALL'
            ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
            : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
        }`}
      >
        <span>Tất cả Domain</span>
        <span className="font-mono text-xs opacity-80">
          {totalReadAll}/{bundle.meta.stats.principles}
        </span>
      </button>

      {mergedDomains.map((d, idx) => {
        const read = d.principles.filter((p) => progress.readPrinciples[p.id]).length;
        const isSelected = selectedDomain === d.id;
        const isExpanded = Boolean(expandedDomains[d.id]);
        const dotColor = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];

        return (
          <div key={d.id} className="space-y-1">
            <div
              className={`flex w-full items-center gap-1.5 rounded-xl px-2.5 py-2 transition ${
                isSelected
                  ? 'bg-[var(--bg-subtle)] font-semibold text-[var(--ink-primary)]'
                  : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]/60'
              }`}
            >
              <button
                type="button"
                onClick={() => handleDomainClick(d.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-[13.5px] cursor-pointer"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="truncate">
                  <span className="font-mono font-bold">{d.id}</span> · {d.name.en}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setExpandedDomains((prev) => (prev[d.id] ? {} : { [d.id]: true }))
                }
                aria-label={isExpanded ? `Thu gọn ${d.id}` : `Mở rộng ${d.id}`}
                className="flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 font-mono text-xs text-[var(--ink-muted)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <span>
                  {read}/{d.principles.length}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {isExpanded && (
              <ul className="ml-3.5 space-y-0.5 border-l border-[var(--border-hairline)] pl-3 py-1">
                {d.principles.map((p) => {
                  const isRead = Boolean(progress.readPrinciples[p.id]);
                  const isCurrent = activePrincipleId === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        data-nav-principle={p.id}
                        onClick={() => handlePrincipleJump(d.id, p.id)}
                        className={`flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] leading-snug transition cursor-pointer ${
                          isCurrent
                            ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent-ink)]'
                            : isRead
                              ? 'text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]'
                              : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        <span className="mt-0.5 w-4 shrink-0 font-mono text-[11.5px] font-semibold opacity-70">
                          {p.number}
                        </span>
                        <span className="flex-1">{pickText(p.title, languageMode)}</span>
                        {isRead && (
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-6">
      <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        {/* Desktop & iPad Landscape Expandable Tree Rail */}
        <div className="surface-card hidden max-h-[calc(100vh-8.5rem)] overflow-y-auto p-3.5 lg:block">
          <div className="px-2 pb-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Danh mục Domain & Nguyên tắc
          </div>
          {renderDomainTree()}
        </div>

        {/* Mobile Compact Pills + Expandable Detail Outline */}
        <div className="surface-card p-3 lg:hidden">
          <div className="flex items-center justify-between gap-2 pb-2">
            <span className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Danh mục Domain
            </span>
            <button
              type="button"
              onClick={() => setMobileTocOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                mobileTocOpen
                  ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]'
                  : 'bg-[var(--bg-subtle)] text-[var(--accent-ink)]'
              }`}
            >
              <ListTree className="h-3.5 w-3.5" />
              <span>{mobileTocOpen ? 'Đóng mục lục' : 'Mục lục chi tiết'}</span>
            </button>
          </div>

          {mobileTocOpen ? (
            <div className="max-h-[60dvh] overflow-y-auto border-t border-[var(--border-hairline)] pt-2">
              {renderDomainTree()}
            </div>
          ) : (
            <nav className="flex w-full gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedDomain('ALL')}
                className={`flex shrink-0 items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition cursor-pointer ${
                  selectedDomain === 'ALL'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                    : 'bg-[var(--bg-subtle)]/70 text-[var(--ink-secondary)]'
                }`}
              >
                <span>Tất cả</span>
                <span className="ml-1.5 font-mono text-[11px]">{bundle.meta.stats.principles}</span>
              </button>

              {mergedDomains.map((d, idx) => {
                const read = d.principles.filter((p) => progress.readPrinciples[p.id]).length;
                const active = selectedDomain === d.id;
                const dotColor = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleDomainClick(d.id)}
                    className={`flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition cursor-pointer ${
                      active
                        ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent-ink)]'
                        : 'bg-[var(--bg-subtle)]/70 text-[var(--ink-secondary)]'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="max-w-[165px] truncate">
                      <span className="font-mono font-bold">{d.id}</span> · {d.name.en}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] opacity-80">
                      {read}/{d.principles.length}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
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
                        data-principle-id={principle.id}
                        data-domain-id={domain.id}
                        className={`surface-card scroll-mt-32 p-4 transition sm:p-6 ${
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
