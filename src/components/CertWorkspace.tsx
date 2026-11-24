import { AlertCircle, AlertTriangle, BookOpen, ClipboardCheck, Compass, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { loadCertBundle } from '../services/dataLoader';
import { getWeakSpotQuestions } from '../services/examEngine';
import type { CertBundle, CertTab, Principle } from '../types/cert';
import { CheatsheetTab } from './tabs/CheatsheetTab';
import { type ExamLaunchIntent, ExamTab } from './tabs/ExamTab';
import { KnowledgeTab } from './tabs/KnowledgeTab';
import { OverviewTab } from './tabs/OverviewTab';
import { WeakSpotTab } from './tabs/WeakSpotTab';

interface CertWorkspaceProps {
  slug: string;
  activeTab: CertTab;
  onChangeTab: (tab: CertTab) => void;
  onBundleLoaded: (bundle: CertBundle | null) => void;
}

const TABS: { id: CertTab; label: string; mobileLabel: string; icon: typeof Compass }[] = [
  { id: 'overview', label: 'Tổng quan', mobileLabel: 'Tổng quan', icon: Compass },
  { id: 'knowledge', label: 'Kiến thức', mobileLabel: 'Kiến thức', icon: BookOpen },
  { id: 'cheatsheet', label: 'Cheatsheet & Glossary', mobileLabel: 'Cheat', icon: Zap },
  { id: 'exam', label: 'Thi thử', mobileLabel: 'Thi thử', icon: ClipboardCheck },
  { id: 'weakspots', label: 'Kho câu sai', mobileLabel: 'Câu sai', icon: AlertTriangle },
];

export function CertWorkspace({ slug, activeTab, onChangeTab, onBundleLoaded }: CertWorkspaceProps) {
  const { getProgress } = useApp();
  const [bundle, setBundle] = useState<CertBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [focusDomainId, setFocusDomainId] = useState<string | null>(null);
  const [focusPrincipleId, setFocusPrincipleId] = useState<string | null>(null);
  const [examIntent, setExamIntent] = useState<ExamLaunchIntent | null>(null);
  const [examFocusMode, setExamFocusMode] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setBundle(null);
    setExamFocusMode(false);
    onBundleLoaded(null);

    loadCertBundle(slug)
      .then((data) => {
        if (!active) return;
        setBundle(data);
        onBundleLoaded(data);
        setLoading(false);
        document.title = `${data.meta.code} — CertStudio`;
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load certification');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, onBundleLoaded]);

  useEffect(() => {
    if (activeTab !== 'exam') setExamFocusMode(false);
  }, [activeTab]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-10">
        <div className="surface-card h-72 animate-pulse bg-[var(--bg-subtle)]/50" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <div className="surface-card p-8">
          <AlertCircle className="mx-auto h-10 w-10 text-[var(--danger)]" />
          <h2 className="mt-3 text-lg font-bold">Không thể tải dữ liệu chứng chỉ</h2>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  const progress = getProgress(slug);
  const weakSpotCount = getWeakSpotQuestions(bundle.questions.questions, progress).length;

  const handleNavigateFromOverview = (
    tab: CertTab,
    opts?: { domainId?: string; autoStartMode?: 'mock' | 'domain' | 'weakspots' }
  ) => {
    if (tab === 'knowledge' && opts?.domainId) setFocusDomainId(opts.domainId);
    if (tab === 'exam' && opts?.autoStartMode) {
      setExamIntent({ id: Date.now(), mode: opts.autoStartMode, domainId: opts.domainId });
    }
    onChangeTab(tab);
  };

  return (
    <div className={examFocusMode ? 'pb-24 md:pb-16' : 'pb-24 md:pb-16'}>
      {/* Desktop & iPad Sticky Top 5-Tab Bar */}
      <div
        className="sticky top-15 z-30 hidden border-b border-[var(--border-hairline)] backdrop-blur-md md:block"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg-canvas) 90%, transparent)' }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav aria-label="Lộ trình học 5 tab" className="-mb-px flex items-center gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeTab(t.id)}
                  className={`relative inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'border-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                  {t.id === 'weakspots' && weakSpotCount > 0 && (
                    <span className="rounded-full bg-[var(--danger)] px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
                      {weakSpotCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-3 pt-4 sm:px-6 sm:pt-7">
        {activeTab === 'overview' && <OverviewTab bundle={bundle} onNavigateTab={handleNavigateFromOverview} />}
        {activeTab === 'knowledge' && (
          <KnowledgeTab
            bundle={bundle}
            focusDomainId={focusDomainId}
            focusPrincipleId={focusPrincipleId}
            onPracticeDomain={(domainId) => {
              setExamIntent({ id: Date.now(), mode: 'domain', domainId });
              onChangeTab('exam');
            }}
            onPracticePrinciple={(principle: Principle) => {
              setExamIntent({ id: Date.now(), mode: 'principle', principle });
              onChangeTab('exam');
            }}
          />
        )}
        {activeTab === 'cheatsheet' && <CheatsheetTab bundle={bundle} />}
        {activeTab === 'exam' && (
          <ExamTab
            bundle={bundle}
            launchIntent={examIntent}
            onConsumeIntent={() => setExamIntent(null)}
            onJumpPrinciple={(pid) => {
              setFocusPrincipleId(pid);
              onChangeTab('knowledge');
            }}
            onActiveSessionChange={setExamFocusMode}
          />
        )}
        {activeTab === 'weakspots' && (
          <WeakSpotTab
            bundle={bundle}
            onStartWeakSpotDrill={() => {
              setExamIntent({ id: Date.now(), mode: 'weakspots' });
              onChangeTab('exam');
            }}
            onJumpPrinciple={(pid) => {
              setFocusPrincipleId(pid);
              onChangeTab('knowledge');
            }}
          />
        )}
      </main>

      {/* Mobile App Native Bottom Tab Bar (hidden during active timed exam focus mode) */}
      {!examFocusMode && (
        <nav
          aria-label="Điều hướng di động 5 tab"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-hairline)] backdrop-blur-lg md:hidden safe-pb"
          style={{ backgroundColor: 'color-mix(in srgb, var(--bg-surface) 94%, transparent)' }}
        >
          <div className="grid grid-cols-5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeTab(t.id)}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-semibold transition cursor-pointer ${
                    active ? 'text-[var(--accent-ink)]' : 'text-[var(--ink-muted)]'
                  }`}
                >
                  {active && (
                    <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--accent)]" />
                  )}
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {t.id === 'weakspots' && weakSpotCount > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--danger)] px-1 font-mono text-[9px] font-bold leading-none text-white">
                        {weakSpotCount > 99 ? '99+' : weakSpotCount}
                      </span>
                    )}
                  </span>
                  <span className="truncate">{t.mobileLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
