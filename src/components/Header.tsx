import { BookOpenCheck, ChevronDown, Database, Moon, Sun } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { assetUrl } from '../services/dataLoader';
import type { LanguageMode } from '../types/cert';

interface HeaderProps {
  activeSlug: string | null;
  onSelectCert: (slug: string | null) => void;
  onOpenDataTools: () => void;
}

const LANG_OPTIONS: { value: LanguageMode; label: string; shortLabel: string; title: string }[] = [
  { value: 'en', label: 'EN', shortLabel: 'EN', title: 'English Only — Chế độ luyện thi thật' },
  { value: 'bilingual', label: 'EN · VI', shortLabel: 'EN·VI', title: 'Song ngữ Anh - Việt' },
  { value: 'vi', label: 'VI', shortLabel: 'VI', title: 'Tiếng Việt Only' },
];

export function Header({ activeSlug, onSelectCert, onOpenDataTools }: HeaderProps) {
  const { catalog, theme, toggleTheme, languageMode, setLanguageMode } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeCert = catalog.find((c) => c.slug === activeSlug) || null;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--border-hairline)] backdrop-blur-md safe-pt"
      style={{ backgroundColor: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)' }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-1.5 px-3 sm:h-15 sm:gap-3 sm:px-6">
        {/* Left: Brand & Compact Cert Switcher */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
          <button
            type="button"
            onClick={() => onSelectCert(null)}
            aria-label="Về trang chủ CertStudio"
            className="flex shrink-0 items-center gap-2 rounded-lg p-1 text-left transition hover:bg-[var(--bg-subtle)] sm:px-2 sm:py-1.5 cursor-pointer"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white dark:text-[#0f1115]">
              <BookOpenCheck className="h-4.5 w-4.5" />
            </span>
            <span className="hidden font-[var(--font-display)] text-[15px] font-bold tracking-tight sm:inline">
              CertStudio
            </span>
          </button>

          {activeCert && (
            <>
              <span className="hidden text-[var(--border-strong)] sm:inline">/</span>
              <div className="relative min-w-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex max-w-[120px] items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2 py-1.5 text-xs font-bold transition hover:border-[var(--border-strong)] sm:max-w-[240px] sm:gap-2 sm:px-2.5 sm:text-sm cursor-pointer"
                >
                  {activeCert.badge && (
                    <img
                      src={assetUrl(activeCert.badge)}
                      alt=""
                      className="h-4.5 w-4.5 shrink-0 object-contain sm:h-5 sm:w-5"
                    />
                  )}
                  <span className="truncate">{activeCert.code}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]" />
                </button>

                {menuOpen && (
                  <div className="surface-card fixed left-3 right-3 top-15 z-50 p-1.5 shadow-2xl sm:absolute sm:left-0 sm:right-auto sm:top-auto sm:mt-2 sm:w-72">
                    <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      Chuyển chứng chỉ
                    </div>
                    {catalog.map((c) => {
                      const isCurrent = c.slug === activeSlug;
                      return (
                        <button
                          key={c.slug}
                          type="button"
                          onClick={() => {
                            onSelectCert(c.slug);
                            setMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm transition cursor-pointer ${
                            isCurrent
                              ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)] font-semibold'
                              : 'hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          {c.badge ? (
                            <img
                              src={assetUrl(c.badge)}
                              alt=""
                              className="h-7 w-7 shrink-0 object-contain"
                            />
                          ) : (
                            <span className="h-7 w-7 shrink-0 rounded bg-[var(--bg-subtle)]" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{c.code}</span>
                              <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                                {c.stats.questions}Q
                              </span>
                            </div>
                            <div className="truncate text-xs text-[var(--ink-secondary)]">
                              {c.name.en}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    <div className="mt-1 border-t border-[var(--border-hairline)] pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCert(null);
                          setMenuOpen(false);
                        }}
                        className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                      >
                        ← Tất cả chứng chỉ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Language Mode, Data Tools, Theme */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div
            role="group"
            aria-label="Chế độ hiển thị ngôn ngữ"
            className="flex items-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5"
          >
            {LANG_OPTIONS.map((opt) => {
              const active = languageMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.title}
                  onClick={() => setLanguageMode(opt.value)}
                  className={`whitespace-nowrap rounded-md px-1.5 py-1 text-[11px] font-semibold transition cursor-pointer sm:px-2.5 sm:text-xs ${
                    active
                      ? 'bg-[var(--accent)] text-white dark:text-[#0f1115] shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <span className="sm:hidden">{opt.shortLabel}</span>
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onOpenDataTools}
            aria-label="Export Updated JSON và Đồng bộ"
            title="Export Updated JSON & Backup/Restore Progress"
            className="flex h-8 w-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] md:w-auto md:px-2.5 cursor-pointer"
          >
            <Database className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden md:inline">Export & Sync</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sang Light mode' : 'Chuyển sang Dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
