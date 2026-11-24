import { RotateCcw, Save, StickyNote, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DecisionRule, Principle, Question } from '../types/cert';

export type EditableTarget =
  | { kind: 'principle'; item: Principle; hasOverride: boolean }
  | { kind: 'rule'; item: DecisionRule; hasOverride: boolean }
  | { kind: 'question'; item: Question; hasOverride: boolean };

interface NoteEditModalProps {
  target: EditableTarget | null;
  onClose: () => void;
  onSavePrinciple?: (
    id: string,
    payload: { title: { en: string; vi: string }; body: { en: string; vi: string }; personal_notes: string }
  ) => void;
  onResetPrinciple?: (id: string) => void;
  onSaveRule?: (
    id: string,
    payload: { situation: { en: string; vi: string }; choice: { en: string; vi: string }; personal_notes: string }
  ) => void;
  onResetRule?: (id: string) => void;
  onSaveQuestion?: (
    uid: string,
    payload: {
      question: { en: string; vi: string };
      explanation: { en: string; vi: string };
      options?: Record<string, { en: string; vi: string }>;
      personal_notes: string;
    }
  ) => void;
  onResetQuestion?: (uid: string) => void;
}

export function NoteEditModal({
  target,
  onClose,
  onSavePrinciple,
  onResetPrinciple,
  onSaveRule,
  onResetRule,
  onSaveQuestion,
  onResetQuestion,
}: NoteEditModalProps) {
  const [notes, setNotes] = useState('');
  const [showContentEdit, setShowContentEdit] = useState(false);

  const [pTitleEn, setPTitleEn] = useState('');
  const [pTitleVi, setPTitleVi] = useState('');
  const [pBodyEn, setPBodyEn] = useState('');
  const [pBodyVi, setPBodyVi] = useState('');

  const [rSitEn, setRSitEn] = useState('');
  const [rSitVi, setRSitVi] = useState('');
  const [rChoiceEn, setRChoiceEn] = useState('');
  const [rChoiceVi, setRChoiceVi] = useState('');

  const [qEn, setQEn] = useState('');
  const [qVi, setQVi] = useState('');
  const [expEn, setExpEn] = useState('');
  const [expVi, setExpVi] = useState('');
  const [qOpts, setQOpts] = useState<Record<string, { en: string; vi: string }>>({});

  useEffect(() => {
    if (!target) return;
    setShowContentEdit(false);
    setNotes(target.item.personal_notes || '');

    if (target.kind === 'principle') {
      setPTitleEn(target.item.title.en);
      setPTitleVi(target.item.title.vi);
      setPBodyEn(target.item.body.en);
      setPBodyVi(target.item.body.vi);
    } else if (target.kind === 'rule') {
      setRSitEn(target.item.situation.en);
      setRSitVi(target.item.situation.vi);
      setRChoiceEn(target.item.choice.en);
      setRChoiceVi(target.item.choice.vi);
    } else if (target.kind === 'question') {
      setQEn(target.item.question.en);
      setQVi(target.item.question.vi);
      setExpEn(target.item.explanation.en);
      setExpVi(target.item.explanation.vi);
      const map: Record<string, { en: string; vi: string }> = {};
      for (const opt of target.item.options || []) {
        map[opt.key] = { en: opt.en, vi: opt.vi };
      }
      setQOpts(map);
    }
  }, [target]);

  if (!target) return null;

  const heading =
    target.kind === 'principle'
      ? `Ghi chú & Chỉnh sửa — Nguyên tắc #${target.item.number}`
      : target.kind === 'rule'
        ? `Ghi chú & Chỉnh sửa — Quy tắc #${target.item.index}`
        : `Ghi chú & Chỉnh sửa — Câu hỏi ${target.item.uid}`;

  const handleSave = () => {
    if (target.kind === 'principle' && onSavePrinciple) {
      onSavePrinciple(target.item.id, {
        title: { en: pTitleEn, vi: pTitleVi },
        body: { en: pBodyEn, vi: pBodyVi },
        personal_notes: notes,
      });
    } else if (target.kind === 'rule' && onSaveRule) {
      onSaveRule(target.item.id, {
        situation: { en: rSitEn, vi: rSitVi },
        choice: { en: rChoiceEn, vi: rChoiceVi },
        personal_notes: notes,
      });
    } else if (target.kind === 'question' && onSaveQuestion) {
      onSaveQuestion(target.item.uid, {
        question: { en: qEn, vi: qVi },
        explanation: { en: expEn, vi: expVi },
        options: Object.keys(qOpts).length ? qOpts : undefined,
        personal_notes: notes,
      });
    }
    onClose();
  };

  const handleReset = () => {
    if (target.kind === 'principle' && onResetPrinciple) onResetPrinciple(target.item.id);
    if (target.kind === 'rule' && onResetRule) onResetRule(target.item.id);
    if (target.kind === 'question' && onResetQuestion) onResetQuestion(target.item.uid);
    onClose();
  };

  const inputClass =
    'w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="surface-card flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none rounded-t-2xl shadow-2xl sm:rounded-2xl safe-pb"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)] sm:hidden" />
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border-hairline)] px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4.5 w-4.5 text-[var(--accent-ink)]" />
            <h3 className="text-base font-bold">{heading}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Ghi chú cá nhân (personal_notes)
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ví dụ: Mẹo nhớ nhanh, từ khóa bẫy cần chú ý, liên hệ với dự án thực tế..."
              className={inputClass}
              autoFocus
            />
          </div>

          <div className="border-t border-[var(--border-hairline)] pt-4">
            <button
              type="button"
              onClick={() => setShowContentEdit((s) => !s)}
              className="text-xs font-semibold text-[var(--accent-ink)] hover:underline cursor-pointer"
            >
              {showContentEdit ? '▾ Ẩn phần chỉnh sửa nội dung gốc' : '▸ Chỉnh sửa nội dung gốc (EN / VI)'}
            </button>

            {showContentEdit && (
              <div className="mt-4 space-y-4">
                {target.kind === 'principle' && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">
                          Title (EN)
                        </label>
                        <input value={pTitleEn} onChange={(e) => setPTitleEn(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">
                          Tiêu đề (VI)
                        </label>
                        <input value={pTitleVi} onChange={(e) => setPTitleVi(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">
                        Explanation (EN)
                      </label>
                      <textarea rows={4} value={pBodyEn} onChange={(e) => setPBodyEn(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">
                        Giải thích (VI)
                      </label>
                      <textarea rows={4} value={pBodyVi} onChange={(e) => setPBodyVi(e.target.value)} className={inputClass} />
                    </div>
                  </>
                )}

                {target.kind === 'rule' && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">
                          Situation (EN)
                        </label>
                        <textarea rows={2} value={rSitEn} onChange={(e) => setRSitEn(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">
                          Tình huống (VI)
                        </label>
                        <textarea rows={2} value={rSitVi} onChange={(e) => setRSitVi(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">
                          Choose (EN)
                        </label>
                        <textarea rows={2} value={rChoiceEn} onChange={(e) => setRChoiceEn(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">
                          Chọn (VI)
                        </label>
                        <textarea rows={2} value={rChoiceVi} onChange={(e) => setRChoiceVi(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  </>
                )}

                {target.kind === 'question' && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">Question (EN)</label>
                      <textarea rows={3} value={qEn} onChange={(e) => setQEn(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">Câu hỏi (VI)</label>
                      <textarea rows={3} value={qVi} onChange={(e) => setQVi(e.target.value)} className={inputClass} />
                    </div>
                    {Object.keys(qOpts).length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-xs font-semibold text-[var(--ink-muted)]">Đáp án (Options)</div>
                        {Object.entries(qOpts).map(([key, val]) => (
                          <div key={key} className="grid gap-2 sm:grid-cols-2">
                            <input
                              value={val.en}
                              onChange={(e) =>
                                setQOpts((prev) => ({ ...prev, [key]: { ...prev[key], en: e.target.value } }))
                              }
                              placeholder={`${key} (EN)`}
                              className={inputClass}
                            />
                            <input
                              value={val.vi}
                              onChange={(e) =>
                                setQOpts((prev) => ({ ...prev, [key]: { ...prev[key], vi: e.target.value } }))
                              }
                              placeholder={`${key} (VI)`}
                              className={inputClass}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">Explanation (EN)</label>
                      <textarea rows={3} value={expEn} onChange={(e) => setExpEn(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">Giải thích (VI)</label>
                      <textarea rows={3} value={expVi} onChange={(e) => setExpVi(e.target.value)} className={inputClass} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 px-6 py-3.5">
          <div>
            {target.hasOverride && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Khôi phục bản gốc
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] dark:text-[#0f1115] cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
