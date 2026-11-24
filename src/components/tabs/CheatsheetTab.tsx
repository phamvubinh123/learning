import { ArrowRight, Bookmark, BookText, Pencil, Search, StickyNote, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { mergeRule } from '../../services/storage';
import type { CertBundle } from '../../types/cert';
import { BilingualBlock } from '../BilingualBlock';
import { type EditableTarget, NoteEditModal } from '../NoteEditModal';

interface CheatsheetTabProps {
  bundle: CertBundle;
}

type SubView = 'rules' | 'vocab' | 'glossary';

export function CheatsheetTab({ bundle }: CheatsheetTabProps) {
  const { getProgress, getOverrides, toggleBookmarkRule, saveRuleOverride, resetRuleOverride } = useApp();

  const slug = bundle.meta.slug;
  const progress = getProgress(slug);
  const overrides = getOverrides(slug);

  const [subView, setSubView] = useState<SubView>('rules');
  const [query, setQuery] = useState('');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string>('ALL');
  const [editTarget, setEditTarget] = useState<EditableTarget | null>(null);

  const mergedRules = useMemo(
    () => bundle.cheatsheet.rules.map((r) => mergeRule(r, overrides)),
    [bundle.cheatsheet.rules, overrides]
  );

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mergedRules.filter((r) => {
      if (onlyBookmarked && !progress.bookmarkedRules[r.id] && !r.personal_notes) return false;
      if (!q) return true;
      return `${r.index} ${r.situation.en} ${r.situation.vi} ${r.choice.en} ${r.choice.vi} ${r.personal_notes || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [mergedRules, query, onlyBookmarked, progress.bookmarkedRules]);

  const filteredVocab = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bundle.cheatsheet.vocabulary.filter((v) => {
      if (!q) return true;
      return `${v.term} ${v.meaning.en} ${v.meaning.vi}`.toLowerCase().includes(q);
    });
  }, [bundle.cheatsheet.vocabulary, query]);

  const glossaryLetters = useMemo(() => {
    const set = new Set<string>();
    for (const g of bundle.cheatsheet.glossary) set.add(g.letter || '#');
    return [...set];
  }, [bundle.cheatsheet.glossary]);

  const filteredGlossary = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bundle.cheatsheet.glossary.filter((g) => {
      if (activeLetter !== 'ALL' && g.letter !== activeLetter) return false;
      if (!q) return true;
      return `${g.term} ${g.definition.en} ${g.definition.vi}`.toLowerCase().includes(q);
    });
  }, [bundle.cheatsheet.glossary, activeLetter, query]);

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubView('rules')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              subView === 'rules'
                ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]'
                : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Quy tắc chọn đáp án ({mergedRules.length})</span>
          </button>

          {bundle.cheatsheet.vocabulary.length > 0 && (
            <button
              type="button"
              onClick={() => setSubView('vocab')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                subView === 'vocab'
                  ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <span>Từ dễ gây nhầm ({bundle.cheatsheet.vocabulary.length})</span>
            </button>
          )}

          {bundle.cheatsheet.glossary.length > 0 && (
            <button
              type="button"
              onClick={() => setSubView('glossary')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                subView === 'glossary'
                  ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <BookText className="h-3.5 w-3.5" />
              <span>Glossary A–Z ({bundle.cheatsheet.glossary.length})</span>
            </button>
          )}
        </div>

        <div className="flex flex-1 items-center gap-2 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm nhanh quy tắc, thuật ngữ..."
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] py-2 pl-10 pr-3.5 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {subView === 'rules' && (
            <button
              type="button"
              onClick={() => setOnlyBookmarked((b) => !b)}
              title="Chỉ hiện quy tắc đã đánh dấu hoặc có ghi chú"
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                onlyBookmarked
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Đánh dấu</span>
            </button>
          )}
        </div>
      </div>

      {subView === 'rules' && (
        <div className="space-y-3">
          {filteredRules.length === 0 ? (
            <div className="surface-card p-10 text-center text-sm text-[var(--ink-muted)]">
              Không có quy tắc nào khớp với bộ lọc hiện tại.
            </div>
          ) : (
            filteredRules.map((rule) => {
              const bookmarked = Boolean(progress.bookmarkedRules[rule.id]);
              const hasOverride = Boolean(overrides.rules[rule.id]);
              return (
                <article
                  key={rule.id}
                  className={`surface-card p-4 sm:p-5 transition ${
                    bookmarked ? 'border-l-4 border-l-[var(--accent)]' : ''
                  }`}
                >
                  <div className="flex flex-col gap-3 md:grid md:grid-cols-[44px_minmax(0,1fr)_28px_minmax(0,1fr)_auto] md:items-start md:gap-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-subtle)] font-mono text-xs font-bold text-[var(--ink-muted)]">
                      {rule.index}
                    </span>

                    <div>
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] md:hidden">
                        Tình huống
                      </div>
                      <BilingualBlock text={rule.situation} primaryClassName="text-[15px] font-medium leading-relaxed" secondaryClassName="text-[14px]" />
                    </div>

                    <div className="hidden pt-1 text-[var(--accent-ink)] md:flex md:justify-center">
                      <ArrowRight className="h-4 w-4" />
                    </div>

                    <div className="rounded-xl bg-[var(--accent-soft)]/70 px-3.5 py-2.5 md:bg-transparent md:p-0">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--accent-ink)] md:hidden">
                        Chọn đáp án
                      </div>
                      <BilingualBlock text={rule.choice} primaryClassName="text-[15px] font-bold leading-relaxed text-[var(--accent-ink)]" secondaryClassName="text-[14px]" />
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-1 md:pt-0">
                      <button
                        type="button"
                        title="Đánh dấu ghi nhớ"
                        onClick={() => toggleBookmarkRule(slug, rule.id)}
                        className={`rounded-lg p-1.5 transition cursor-pointer ${
                          bookmarked ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]' : 'text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <Bookmark className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Edit / Add Note"
                        onClick={() => setEditTarget({ kind: 'rule', item: rule, hasOverride })}
                        className="rounded-lg p-1.5 text-[var(--ink-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {rule.personal_notes && (
                    <div className="mt-3 rounded-xl border border-[var(--warn)]/35 bg-[var(--warn-soft)] px-3.5 py-2.5 text-sm">
                      <span className="inline-flex items-center gap-1 font-bold text-[var(--warn)]">
                        <StickyNote className="h-3.5 w-3.5" />
                        Ghi chú:
                      </span>{' '}
                      <span className="whitespace-pre-wrap text-[var(--ink-primary)]">{rule.personal_notes}</span>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {subView === 'vocab' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVocab.map((item) => (
            <div key={item.id} className="surface-card p-4">
              <div className="font-[var(--font-display)] text-[17px] font-bold text-[var(--accent-ink)]">{item.term}</div>
              <div className="mt-1.5 text-[15px] leading-relaxed text-[var(--ink-secondary)]">
                <BilingualBlock text={item.meaning} />
              </div>
            </div>
          ))}
        </div>
      )}

      {subView === 'glossary' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveLetter('ALL')}
              className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition cursor-pointer ${
                activeLetter === 'ALL' ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]' : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              ALL
            </button>
            {glossaryLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => setActiveLetter(letter)}
                className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition cursor-pointer ${
                  activeLetter === letter ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]' : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>

          <div className="surface-card divide-y divide-[var(--border-hairline)] overflow-hidden">
            {filteredGlossary.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--ink-muted)]">Không tìm thấy thuật ngữ phù hợp.</div>
            ) : (
              filteredGlossary.map((g) => (
                <div key={g.id} className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-baseline sm:gap-4 sm:px-5">
                  <span className="font-semibold text-[15px] text-[var(--ink-primary)] sm:w-64 sm:shrink-0">{g.term}</span>
                  <span className="text-[15px] leading-relaxed text-[var(--ink-secondary)]">
                    <BilingualBlock text={g.definition} inline />
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <NoteEditModal
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaveRule={(id, payload) => saveRuleOverride(slug, id, payload)}
        onResetRule={(id) => resetRuleOverride(slug, id)}
      />
    </div>
  );
}
