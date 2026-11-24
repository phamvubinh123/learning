import { useApp } from '../context/AppContext';
import type { BilingualText } from '../types/cert';

interface BilingualBlockProps {
  text: BilingualText;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  inline?: boolean;
}

export function BilingualBlock({
  text,
  className = '',
  primaryClassName = '',
  secondaryClassName = '',
  inline = false,
}: BilingualBlockProps) {
  const { languageMode } = useApp();

  const en = (text.en || '').trim();
  const vi = (text.vi || '').trim();
  const identical = en.toLowerCase() === vi.toLowerCase();

  if (languageMode === 'en') {
    const content = en || vi;
    return inline ? (
      <span className={`${primaryClassName} ${className}`}>{content}</span>
    ) : (
      <div className={`${primaryClassName} ${className}`}>{content}</div>
    );
  }

  if (languageMode === 'vi') {
    const content = vi || en;
    return inline ? (
      <span className={`${primaryClassName} ${className}`}>{content}</span>
    ) : (
      <div className={`${primaryClassName} ${className}`}>{content}</div>
    );
  }

  if (identical || !en || !vi) {
    const content = en || vi;
    return inline ? (
      <span className={`${primaryClassName} ${className}`}>{content}</span>
    ) : (
      <div className={`${primaryClassName} ${className}`}>{content}</div>
    );
  }

  if (inline) {
    return (
      <span className={className}>
        <span className={primaryClassName}>{en}</span>
        <span className={`block mt-0.5 text-[0.92em] text-[var(--ink-secondary)] ${secondaryClassName}`}>
          {vi}
        </span>
      </span>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className={primaryClassName} lang="en">
        {en}
      </p>
      <p
        className={`text-[var(--ink-secondary)] border-l-2 border-[var(--border-hairline)] pl-3 ${secondaryClassName}`}
        lang="vi"
      >
        {vi}
      </p>
    </div>
  );
}

export function pickText(text: BilingualText, mode: 'en' | 'bilingual' | 'vi'): string {
  if (mode === 'en') return text.en || text.vi;
  if (mode === 'vi') return text.vi || text.en;
  return text.en || text.vi;
}
