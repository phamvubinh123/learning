import { CheckCircle2, Download, FileJson, RefreshCw, Upload, X, AlertTriangle } from 'lucide-react';
import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  buildUpdatedCheatsheetJson,
  buildUpdatedKnowledgeJson,
  buildUpdatedQuestionsJson,
  downloadJsonFile,
  parseBackupFile,
} from '../services/storage';
import type { CertBundle } from '../types/cert';

interface DataToolsModalProps {
  open: boolean;
  onClose: () => void;
  activeBundle: CertBundle | null;
}

export function DataToolsModal({ open, onClose, activeBundle }: DataToolsModalProps) {
  const { getOverrides, exportFullBackup, restoreBackup, resetCertProgress } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;

  const activeSlug = activeBundle?.meta.slug || null;
  const activeOverrides = activeSlug ? getOverrides(activeSlug) : null;

  const editedPrinciplesCount = activeOverrides ? Object.keys(activeOverrides.principles).length : 0;
  const editedRulesCount = activeOverrides ? Object.keys(activeOverrides.rules).length : 0;
  const editedQuestionsCount = activeOverrides ? Object.keys(activeOverrides.questions).length : 0;

  const handleExportKnowledge = () => {
    if (!activeBundle) return;
    const merged = buildUpdatedKnowledgeJson(activeBundle.knowledge, activeOverrides || undefined);
    downloadJsonFile('knowledge.json', merged);
    setFeedback({
      type: 'ok',
      message: `Đã xuất knowledge.json cho ${activeBundle.meta.code} (gồm ${editedPrinciplesCount} chỉnh sửa/ghi chú). Chép vào public/data/${activeBundle.meta.slug}/knowledge.json để cập nhật source.`,
    });
  };

  const handleExportCheatsheet = () => {
    if (!activeBundle) return;
    const merged = buildUpdatedCheatsheetJson(activeBundle.cheatsheet, activeOverrides || undefined);
    downloadJsonFile('cheatsheet.json', merged);
    setFeedback({
      type: 'ok',
      message: `Đã xuất cheatsheet.json cho ${activeBundle.meta.code} (gồm ${editedRulesCount} chỉnh sửa/ghi chú). Chép vào public/data/${activeBundle.meta.slug}/cheatsheet.json.`,
    });
  };

  const handleExportQuestions = () => {
    if (!activeBundle) return;
    const merged = buildUpdatedQuestionsJson(activeBundle.questions, activeOverrides || undefined);
    downloadJsonFile('questions.json', merged);
    setFeedback({
      type: 'ok',
      message: `Đã xuất questions.json cho ${activeBundle.meta.code} (gồm ${editedQuestionsCount} chỉnh sửa/ghi chú). Chép vào public/data/${activeBundle.meta.slug}/questions.json.`,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupFile(text);
      restoreBackup(parsed, restoreMode);
      setFeedback({
        type: 'ok',
        message:
          restoreMode === 'merge'
            ? 'Đã gộp (Merge) dữ liệu backup thành công!'
            : 'Đã khôi phục (Replace) toàn bộ dữ liệu từ file backup!',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        message: err instanceof Error ? err.message : 'File JSON không hợp lệ.',
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="surface-card max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-b-none rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl sm:p-6 safe-pb"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border-strong)] sm:hidden" />
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
          <div>
            <h2 className="text-lg font-bold">Quản lý Dữ liệu, Export JSON & Đồng bộ</h2>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              Mọi ghi chú, chỉnh sửa nội dung và tiến độ học đều lưu cục bộ trên trình duyệt (localStorage).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'ok'
                ? 'border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success)]'
                : 'border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <section className="mt-5">
          <div className="flex items-center gap-2 text-sm font-bold">
            <FileJson className="h-4 w-4 text-[var(--accent-ink)]" />
            <span>1. Export Updated JSON (Cập nhật vào Source Code)</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
            Xuất lại file JSON gốc đã gộp sẵn toàn bộ chỉnh sửa và{' '}
            <code className="font-mono text-[11px]">personal_notes</code> để bạn commit trực tiếp vào{' '}
            <code className="font-mono text-[11px]">
              public/data/{activeSlug || '<slug>'}/
            </code>
            .
          </p>

          {activeBundle ? (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleExportKnowledge}
                className="flex flex-col items-start rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-3 text-left transition hover:border-[var(--accent)] cursor-pointer"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-mono text-xs font-semibold">knowledge.json</span>
                  <Download className="h-3.5 w-3.5 text-[var(--accent-ink)]" />
                </div>
                <span className="mt-1 text-[11px] text-[var(--ink-muted)]">
                  {editedPrinciplesCount} mục đã sửa/ghi chú
                </span>
              </button>

              <button
                type="button"
                onClick={handleExportCheatsheet}
                className="flex flex-col items-start rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-3 text-left transition hover:border-[var(--accent)] cursor-pointer"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-mono text-xs font-semibold">cheatsheet.json</span>
                  <Download className="h-3.5 w-3.5 text-[var(--accent-ink)]" />
                </div>
                <span className="mt-1 text-[11px] text-[var(--ink-muted)]">
                  {editedRulesCount} quy tắc đã sửa/ghi chú
                </span>
              </button>

              <button
                type="button"
                onClick={handleExportQuestions}
                className="flex flex-col items-start rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-3 text-left transition hover:border-[var(--accent)] cursor-pointer"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-mono text-xs font-semibold">questions.json</span>
                  <Download className="h-3.5 w-3.5 text-[var(--accent-ink)]" />
                </div>
                <span className="mt-1 text-[11px] text-[var(--ink-muted)]">
                  {editedQuestionsCount} câu hỏi đã sửa/ghi chú
                </span>
              </button>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border-strong)] p-3 text-xs text-[var(--ink-muted)]">
              Hãy mở một chứng chỉ cụ thể (CCAR-F, CCAR-P, CPMAI, PMP) để xuất các file JSON đã cập nhật của chứng chỉ đó.
            </div>
          )}
        </section>

        <section className="mt-6 border-t border-[var(--border-hairline)] pt-5">
          <div className="flex items-center gap-2 text-sm font-bold">
            <RefreshCw className="h-4 w-4 text-[var(--accent-ink)]" />
            <span>2. Backup & Restore Progress (Đồng bộ giữa Laptop & iPad)</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
            Tải về 1 file backup duy nhất chứa toàn bộ tiến độ đọc, lịch sử thi thử, kho câu sai và ghi chú cá nhân của tất cả chứng chỉ.
          </p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                exportFullBackup();
                setFeedback({ type: 'ok', message: 'Đã tải xuống file backup toàn bộ tiến độ!' });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] dark:text-[#0f1115] cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Tải Backup (.json)</span>
            </button>

            <div className="flex flex-1 items-center gap-2">
              <select
                value={restoreMode}
                onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-3 py-2.5 text-xs font-semibold text-[var(--ink-primary)]"
              >
                <option value="merge">Chế độ: Gộp (Merge)</option>
                <option value="replace">Chế độ: Ghi đè (Replace)</option>
              </select>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span>Khôi phục từ file</span>
              </button>
            </div>
          </div>
        </section>

        {activeBundle && (
          <section className="mt-6 border-t border-[var(--border-hairline)] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--ink-secondary)]">
                  Đặt lại tiến độ học của {activeBundle.meta.code}
                </div>
                <div className="text-[11px] text-[var(--ink-muted)]">
                  Xóa trạng thái đã đọc, lịch sử thi thử và kho câu sai (không xóa ghi chú/chỉnh sửa nội dung).
                </div>
              </div>
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="rounded-lg border border-[var(--danger)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] cursor-pointer"
                >
                  Reset Progress
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetCertProgress(activeBundle.meta.slug);
                      setConfirmReset(false);
                      setFeedback({
                        type: 'ok',
                        message: `Đã đặt lại tiến độ học của ${activeBundle.meta.code}.`,
                      });
                    }}
                    className="rounded-lg bg-[var(--danger)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                  >
                    Xác nhận xóa
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
