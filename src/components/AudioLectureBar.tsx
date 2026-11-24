import { Headphones, Pause, Play, SkipBack, SkipForward, Volume2, X } from 'lucide-react';
import type { SpeechStyle } from '../services/speechService';

interface AudioLectureBarProps {
  title: string;
  subtitle: string;
  isPlaying: boolean;
  isPaused: boolean;
  style: SpeechStyle;
  rate: number;
  hasPrev: boolean;
  hasNext: boolean;
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
  style,
  rate,
  hasPrev,
  hasNext,
  onTogglePlayPause,
  onPrev,
  onNext,
  onStop,
  onToggleStyle,
  onCycleRate,
}: AudioLectureBarProps) {
  if (!isPlaying && !isPaused) return null;

  return (
    <div className="fixed inset-x-3 bottom-16 z-40 md:inset-x-auto md:bottom-6 md:right-6 md:w-[420px]">
      <div className="surface-card border-[var(--accent)]/40 bg-[var(--bg-surface)]/95 p-3.5 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">
              {style === 'lecture' ? <Headphones className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                {subtitle}
              </div>
              <div className="truncate text-sm font-bold text-[var(--ink-primary)]">{title}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onStop}
            aria-label="Đóng trình phát"
            className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-2.5">
          {/* Style & Speed */}
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

          {/* Transport Controls */}
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
              onClick={onTogglePlayPause}
              aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)] dark:text-[#0f1115] cursor-pointer"
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
