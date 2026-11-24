import { Headphones, Pause, Play, Settings2, SkipBack, SkipForward, Volume2, X } from 'lucide-react';
import { useState } from 'react';
import {
  getSortedVoicesForLang,
  type SpeechPreferences,
  type SpeechStyle,
} from '../services/speechService';

interface AudioLectureBarProps {
  title: string;
  subtitle: string;
  isPlaying: boolean;
  isPaused: boolean;
  isLoadingAudio?: boolean;
  errorMsg?: string | null;
  style: SpeechStyle;
  rate: number;
  hasPrev: boolean;
  hasNext: boolean;
  voices: SpeechSynthesisVoice[];
  prefs: SpeechPreferences;
  onUpdatePrefs: (next: SpeechPreferences) => void;
  onTogglePlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
  onToggleStyle: () => void;
  onCycleRate: () => void;
}

export function AudioLectureBar({
  title,
  subtitle,
  isPlaying,
  isPaused,
  isLoadingAudio,
  errorMsg,
  style,
  rate,
  hasPrev,
  hasNext,
  voices,
  prefs,
  onUpdatePrefs,
  onTogglePlayPause,
  onPrev,
  onNext,
  onStop,
  onToggleStyle,
  onCycleRate,
}: AudioLectureBarProps) {
  const [showSettings, setShowSettings] = useState(false);

  if (!isPlaying && !isPaused && !isLoadingAudio) return null;

  const viVoices = getSortedVoicesForLang(voices, 'vi-VN');
  const enVoices = getSortedVoicesForLang(voices, 'en-US');
  const usingOpenAI = Boolean(prefs.openaiApiKey.trim());

  return (
    <div className="fixed inset-x-3 bottom-16 z-40 md:inset-x-auto md:bottom-6 md:right-6 md:w-[430px]">
      {showSettings && (
        <div className="surface-card mb-2 border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 shadow-2xl">
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-hairline)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-primary)]">
              Cài đặt giọng đọc
            </span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="rounded p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            {!usingOpenAI && (
              <>
                <div>
                  <label className="mb-1 block font-semibold text-[var(--ink-secondary)]">
                    Giọng Tiếng Việt
                  </label>
                  <select
                    value={prefs.viVoiceName}
                    onChange={(e) => onUpdatePrefs({ ...prefs, viVoiceName: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2.5 py-1.5 text-xs text-[var(--ink-primary)]"
                  >
                    <option value="">Tự động chọn giọng tốt nhất ({viVoices[0]?.name || 'Mặc định'})</option>
                    {viVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[var(--ink-secondary)]">
                    Giọng Tiếng Anh (cho từ chuyên ngành)
                  </label>
                  <select
                    value={prefs.enVoiceName}
                    onChange={(e) => onUpdatePrefs({ ...prefs, enVoiceName: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2.5 py-1.5 text-xs text-[var(--ink-primary)]"
                  >
                    <option value="">Tự động chọn giọng tốt nhất ({enVoices[0]?.name || 'Mặc định'})</option>
                    {enVoices.slice(0, 15).map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>

                <p className="rounded-lg bg-[var(--bg-subtle)] p-2.5 text-[11px] leading-relaxed text-[var(--ink-muted)]">
                  Mẹo giọng hay miễn phí: Trên PC dùng <strong>Microsoft Edge</strong> (có giọng <em>HoaiMy Natural</em>); trên iPhone vào <em>Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Việt</em> tải <strong>Linh (Nâng cao)</strong>.
                </p>
              </>
            )}

            <div className="border-t border-[var(--border-hairline)] pt-2.5">
              <label className="mb-1 block font-semibold text-[var(--ink-secondary)]">
                OpenAI Neural Voice (tuỳ chọn — đọc như người thật, trộn Anh-Việt mượt)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="password"
                  value={prefs.openaiApiKey}
                  onChange={(e) => onUpdatePrefs({ ...prefs, openaiApiKey: e.target.value })}
                  placeholder="sk-... (lưu cục bộ trên máy bạn)"
                  className="flex-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2.5 py-1.5 text-xs text-[var(--ink-primary)]"
                />
                <select
                  value={prefs.openaiVoice}
                  onChange={(e) =>
                    onUpdatePrefs({
                      ...prefs,
                      openaiVoice: e.target.value as SpeechPreferences['openaiVoice'],
                    })
                  }
                  className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2 py-1.5 text-xs text-[var(--ink-primary)]"
                >
                  <option value="nova">Nova</option>
                  <option value="alloy">Alloy</option>
                  <option value="shimmer">Shimmer</option>
                  <option value="echo">Echo</option>
                  <option value="onyx">Onyx</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="surface-card border-[var(--accent)]/40 bg-[var(--bg-surface)]/95 p-3.5 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">
              {style === 'lecture' ? <Headphones className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate text-[11px] font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                <span>{isLoadingAudio ? 'Đang tạo giọng AI...' : subtitle}</span>
                {usingOpenAI && (
                  <span className="rounded bg-[var(--accent-soft)] px-1 py-0.5 text-[9px]">AI Voice</span>
                )}
              </div>
              <div className="truncate text-sm font-bold text-[var(--ink-primary)]">{title}</div>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setShowSettings((s) => !s)}
              aria-label="Cài đặt giọng đọc"
              title="Chọn giọng đọc / AI Voice"
              className={`rounded-lg p-1.5 transition cursor-pointer ${
                showSettings
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onStop}
              aria-label="Đóng trình phát"
              className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-2 rounded-lg bg-[var(--danger-soft)] px-2.5 py-1.5 text-[11px] text-[var(--danger)]">
            {errorMsg}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleStyle}
              className="rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
            >
              {style === 'lecture' ? 'Giảng bài' : 'Đọc nguyên văn'}
            </button>
            <button
              type="button"
              onClick={onCycleRate}
              className="rounded-lg bg-[var(--bg-subtle)] px-2 py-1 font-mono text-xs font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
            >
              {rate}x
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={onPrev}
              aria-label="Nguyên tắc trước"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={isLoadingAudio}
              onClick={onTogglePlayPause}
              aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50 dark:text-[#0f1115] cursor-pointer"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>

            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              aria-label="Nguyên tắc tiếp theo"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
