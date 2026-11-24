import { CheckCircle2, FileText, Flag, Pencil, StickyNote, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { assetUrl } from '../services/dataLoader';
import { gradeQuestion } from '../services/examEngine';
import type { CaseStudy, Question, UserAnswer } from '../types/cert';
import { BilingualBlock, pickText } from './BilingualBlock';

interface QuestionCardProps {
  question: Question;
  caseStudy?: CaseStudy;
  index?: number;
  total?: number;
  answer: UserAnswer | undefined;
  onChangeAnswer?: (answer: UserAnswer) => void;
  revealAnswer: boolean;
  flagged?: boolean;
  onToggleFlag?: () => void;
  onEditNote?: () => void;
  hasOverride?: boolean;
  onJumpPrinciple?: (principleId: string) => void;
}

export function QuestionCard({
  question,
  caseStudy,
  index,
  total,
  answer,
  onChangeAnswer,
  revealAnswer,
  flagged,
  onToggleFlag,
  onEditNote,
  hasOverride,
  onJumpPrinciple,
}: QuestionCardProps) {
  const { languageMode } = useApp();
  const isCorrect = revealAnswer ? gradeQuestion(question, answer) : null;
  const locked = revealAnswer || !onChangeAnswer;

  const handleSingleSelect = (key: string) => {
    if (locked || !onChangeAnswer) return;
    onChangeAnswer(key);
  };

  const handleMultiToggle = (key: string) => {
    if (locked || !onChangeAnswer) return;
    const current = Array.isArray(answer) ? answer : [];
    const maxSelect = question.select || (Array.isArray(question.correct) ? question.correct.length : 4);
    if (current.includes(key)) {
      onChangeAnswer(current.filter((k) => k !== key));
    } else if (current.length < maxSelect) {
      onChangeAnswer([...current, key]);
    } else if (maxSelect === 1) {
      onChangeAnswer([key]);
    }
  };

  const handleDropdownChange = (blankId: string, optionIdx: number) => {
    if (locked || !onChangeAnswer) return;
    const current =
      answer && typeof answer === 'object' && !Array.isArray(answer)
        ? { ...(answer as Record<string, number>) }
        : {};
    current[blankId] = optionIdx;
    onChangeAnswer(current);
  };

  const handleHotspotToggle = (regionId: string) => {
    if (locked || !onChangeAnswer) return;
    const current = Array.isArray(answer) ? answer : [];
    const maxSelect = question.select || 1;
    if (maxSelect === 1) {
      onChangeAnswer([regionId]);
      return;
    }
    if (current.includes(regionId)) {
      onChangeAnswer(current.filter((id) => id !== regionId));
    } else if (current.length < maxSelect) {
      onChangeAnswer([...current, regionId]);
    }
  };

  const correctArray = Array.isArray(question.correct)
    ? question.correct
    : question.correct
      ? [question.correct]
      : [];

  return (
    <article className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55 px-4 py-2.5 sm:px-5 sm:py-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {index !== undefined && total !== undefined && (
            <span className="font-mono text-xs font-bold text-[var(--ink-primary)]">
              Câu {index + 1}/{total}
            </span>
          )}
          <span className="rounded-md bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--ink-secondary)] border border-[var(--border-hairline)]">
            {question.domain}
          </span>
          <span className="hidden font-mono text-[11px] text-[var(--ink-muted)] sm:inline">{question.uid}</span>
          {question.type !== 'single' && (
            <span className="rounded-md bg-[var(--warn-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warn)]">
              {question.type === 'multi'
                ? `Chọn ${question.select || correctArray.length}`
                : question.type === 'dropdown'
                  ? 'Dropdown'
                  : 'Hotspot'}
            </span>
          )}
          {hasOverride && (
            <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-ink)]">
              Edited
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onToggleFlag && (
            <button
              type="button"
              onClick={onToggleFlag}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition cursor-pointer ${
                flagged
                  ? 'bg-[var(--warn-soft)] text-[var(--warn)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <Flag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{flagged ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
            </button>
          )}
          {onEditNote && (
            <button
              type="button"
              onClick={onEditNote}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--ink-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)] cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>{question.personal_notes ? 'Note' : 'Note'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
        {caseStudy && (
          <details className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 p-4" open>
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-ink)]">
              <FileText className="h-4 w-4" />
              <span>Case Study: {pickText(caseStudy.title, languageMode)}</span>
            </summary>
            <div className="mt-3 text-sm leading-relaxed">
              <BilingualBlock text={caseStudy.body} primaryClassName="reading-prose" />
            </div>
          </details>
        )}

        <BilingualBlock
          text={question.question}
          primaryClassName="text-[16px] font-medium leading-[1.7] text-[var(--ink-primary)]"
          secondaryClassName="text-[14.5px] leading-[1.68]"
        />

        {(question.type === 'single' || question.type === 'multi') && question.options && (
          <div className="space-y-2.5">
            {question.options.map((opt) => {
              const selected =
                question.type === 'single'
                  ? answer === opt.key
                  : Array.isArray(answer) && answer.includes(opt.key);
              const isRightOption = correctArray.includes(opt.key);

              let containerStyle =
                'border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]/50';
              if (revealAnswer) {
                if (isRightOption) {
                  containerStyle = 'border-[var(--success)] bg-[var(--success-soft)]';
                } else if (selected && !isRightOption) {
                  containerStyle = 'border-[var(--danger)] bg-[var(--danger-soft)]';
                } else {
                  containerStyle = 'border-[var(--border-hairline)] opacity-75';
                }
              } else if (selected) {
                containerStyle = 'border-[var(--accent)] bg-[var(--accent-soft)]';
              }

              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={locked}
                  onClick={() =>
                    question.type === 'single'
                      ? handleSingleSelect(opt.key)
                      : handleMultiToggle(opt.key)
                  }
                  className={`flex w-full items-start gap-3.5 rounded-xl border p-3.5 text-left transition ${
                    locked ? 'cursor-default' : 'cursor-pointer'
                  } ${containerStyle}`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                      revealAnswer && isRightOption
                        ? 'bg-[var(--success)] text-white dark:text-[#0f1115]'
                        : revealAnswer && selected && !isRightOption
                          ? 'bg-[var(--danger)] text-white'
                          : selected
                            ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]'
                            : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                    }`}
                  >
                    {opt.key}
                  </span>
                  <div className="min-w-0 flex-1 text-sm leading-relaxed">
                    <BilingualBlock
                      text={{ en: opt.en, vi: opt.vi }}
                      primaryClassName="text-[var(--ink-primary)]"
                      secondaryClassName="text-[13.5px]"
                    />
                  </div>
                  {revealAnswer && isRightOption && (
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[var(--success)]" />
                  )}
                  {revealAnswer && selected && !isRightOption && (
                    <XCircle className="mt-1 h-5 w-5 shrink-0 text-[var(--danger)]" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'dropdown' && question.blanks && (
          <div className="space-y-3">
            {question.blanks.map((blank, bIdx) => {
              const currentMap =
                answer && typeof answer === 'object' && !Array.isArray(answer)
                  ? (answer as Record<string, number>)
                  : {};
              const chosenIdx = currentMap[blank.id];
              const isBlankRight = revealAnswer && chosenIdx === blank.correct;
              const isBlankWrong = revealAnswer && chosenIdx !== blank.correct;

              return (
                <div
                  key={blank.id}
                  className={`rounded-xl border p-4 ${
                    isBlankRight
                      ? 'border-[var(--success)] bg-[var(--success-soft)]'
                      : isBlankWrong
                        ? 'border-[var(--danger)] bg-[var(--danger-soft)]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50'
                  }`}
                >
                  <div className="mb-2.5 flex items-start gap-2">
                    <span className="mt-0.5 font-mono text-xs font-bold text-[var(--ink-muted)]">
                      {bIdx + 1}.
                    </span>
                    <BilingualBlock
                      text={blank.label}
                      primaryClassName="text-sm font-medium text-[var(--ink-primary)]"
                      secondaryClassName="text-xs"
                    />
                  </div>
                  <select
                    disabled={locked}
                    value={chosenIdx === undefined ? '' : String(chosenIdx)}
                    onChange={(e) => {
                      if (e.target.value !== '') {
                        handleDropdownChange(blank.id, Number(e.target.value));
                      }
                    }}
                    className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    <option value="">-- Chọn đáp án phù hợp --</option>
                    {blank.options.map((o) => {
                      const label =
                        languageMode === 'en'
                          ? o.en
                          : languageMode === 'vi'
                            ? o.vi
                            : o.en === o.vi
                              ? o.en
                              : `${o.en} — ${o.vi}`;
                      return (
                        <option key={o.index} value={String(o.index)}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  {revealAnswer && isBlankWrong && (
                    <div className="mt-2 text-xs font-semibold text-[var(--success)]">
                      Đáp án đúng:{' '}
                      {pickText(
                        {
                          en: blank.options[blank.correct]?.en || '',
                          vi: blank.options[blank.correct]?.vi || '',
                        },
                        languageMode
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {question.type === 'hotspot' && question.regions && (
          <div className="space-y-4">
            {question.image && (
              <div className="relative mx-auto max-w-[560px] overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-white p-2">
                <div className="relative w-full">
                  <img
                    src={assetUrl(question.image.src)}
                    alt={pickText(question.image.alt, languageMode)}
                    className="block h-auto w-full select-none"
                  />
                  {question.regions.map((region) => {
                    const [x, y, w, h] = region.coords;
                    const leftPct = (x / question.image!.w) * 100;
                    const topPct = (y / question.image!.h) * 100;
                    const widthPct = (w / question.image!.w) * 100;
                    const heightPct = (h / question.image!.h) * 100;
                    const selected = Array.isArray(answer) && answer.includes(region.id);
                    const isRight = correctArray.includes(region.id);

                    let ring = 'border-transparent hover:border-[var(--accent)] hover:bg-[var(--accent)]/15';
                    if (revealAnswer) {
                      if (isRight) ring = 'border-emerald-600 bg-emerald-500/25';
                      else if (selected) ring = 'border-rose-600 bg-rose-500/25';
                    } else if (selected) {
                      ring = 'border-teal-600 bg-teal-500/25';
                    }

                    return (
                      <button
                        key={region.id}
                        type="button"
                        disabled={locked}
                        title={pickText(region.label, languageMode)}
                        onClick={() => handleHotspotToggle(region.id)}
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${widthPct}%`,
                          height: `${heightPct}%`,
                        }}
                        className={`absolute rounded-lg border-2 transition ${
                          locked ? 'cursor-default' : 'cursor-pointer'
                        } ${ring}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {question.regions.map((region) => {
                const selected = Array.isArray(answer) && answer.includes(region.id);
                const isRight = correctArray.includes(region.id);
                let style = 'border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]';
                if (revealAnswer) {
                  if (isRight) style = 'border-[var(--success)] bg-[var(--success-soft)]';
                  else if (selected) style = 'border-[var(--danger)] bg-[var(--danger-soft)]';
                } else if (selected) {
                  style = 'border-[var(--accent)] bg-[var(--accent-soft)]';
                }
                return (
                  <button
                    key={region.id}
                    type="button"
                    disabled={locked}
                    onClick={() => handleHotspotToggle(region.id)}
                    className={`rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition ${
                      locked ? 'cursor-default' : 'cursor-pointer'
                    } ${style}`}
                  >
                    <BilingualBlock text={region.label} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {question.personal_notes && (
          <div className="rounded-xl border border-[var(--warn)]/35 bg-[var(--warn-soft)] px-4 py-3 text-sm">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--warn)]">
              <StickyNote className="h-3.5 w-3.5" />
              <span>Ghi chú cá nhân</span>
            </div>
            <p className="whitespace-pre-wrap text-[var(--ink-primary)]">{question.personal_notes}</p>
          </div>
        )}

        {revealAnswer && (
          <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/75 p-4 sm:p-5">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-4.5 w-4.5 text-[var(--success)]" />
                    <span className="text-[var(--success)]">Chính xác!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4.5 w-4.5 text-[var(--danger)]" />
                    <span className="text-[var(--danger)]">
                      Chưa đúng
                      {correctArray.length > 0 && question.type !== 'dropdown'
                        ? ` · Đáp án đúng: ${correctArray.join(', ')}`
                        : ''}
                    </span>
                  </>
                )}
              </div>

              {question.principles.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {question.principles.map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => onJumpPrinciple?.(pid)}
                      className="rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--accent-ink)] hover:border-[var(--accent)] cursor-pointer"
                    >
                      #{pid}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <BilingualBlock
              text={question.explanation}
              primaryClassName="reading-prose text-[14.5px]"
              secondaryClassName="text-[14px]"
            />
          </div>
        )}
      </div>
    </article>
  );
}
