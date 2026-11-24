import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Grid3X3,
  History,
  Play,
  RotateCcw,
  Timer,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  buildWeightedMockExam,
  formatDuration,
  getWeakSpotQuestions,
  gradeQuestion,
  isAnswerComplete,
  shuffleArray,
} from '../../services/examEngine';
import { mergeQuestion } from '../../services/storage';
import type { CertBundle, ExamHistoryEntry, Principle, Question, UserAnswer } from '../../types/cert';
import { type EditableTarget, NoteEditModal } from '../NoteEditModal';
import { QuestionCard } from '../QuestionCard';

export interface ExamLaunchIntent {
  id: number;
  mode: 'mock' | 'domain' | 'weakspots' | 'principle';
  domainId?: string;
  principle?: Principle;
}

interface ExamTabProps {
  bundle: CertBundle;
  launchIntent: ExamLaunchIntent | null;
  onConsumeIntent: () => void;
  onJumpPrinciple: (principleId: string) => void;
}

interface ActiveSession {
  mode: 'mock' | 'domain' | 'quick' | 'weakspots' | 'principle';
  label: string;
  questionUids: string[];
  answers: Record<string, UserAnswer>;
  revealed: Record<string, boolean>;
  flagged: Record<string, boolean>;
  currentIdx: number;
  instantFeedback: boolean;
  timedLimitSec: number | null;
  elapsedSec: number;
  submitted: boolean;
  recorded: boolean;
}

export function ExamTab({ bundle, launchIntent, onConsumeIntent, onJumpPrinciple }: ExamTabProps) {
  const {
    getProgress,
    getOverrides,
    recordQuestionResult,
    recordBatchResults,
    addExamHistory,
    saveQuestionOverride,
    resetQuestionOverride,
  } = useApp();

  const slug = bundle.meta.slug;
  const progress = getProgress(slug);
  const overrides = getOverrides(slug);

  const [selectedDomains, setSelectedDomains] = useState<string[]>(() =>
    bundle.meta.domains.map((d) => d.id)
  );
  const [practiceCount, setPracticeCount] = useState<number>(20);
  const [practicePoolFilter, setPracticePoolFilter] = useState<'all' | 'unanswered' | 'wrong'>('all');
  const [practiceInstant, setPracticeInstant] = useState<boolean>(true);

  const [session, setSession] = useState<ActiveSession | null>(null);
  const [showNavGrid, setShowNavGrid] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'flagged'>('all');
  const [editTarget, setEditTarget] = useState<EditableTarget | null>(null);

  const mergedQuestions = useMemo(
    () => bundle.questions.questions.map((q) => mergeQuestion(q, overrides)),
    [bundle.questions.questions, overrides]
  );

  const questionMap = useMemo(() => new Map(mergedQuestions.map((q) => [q.uid, q])), [mergedQuestions]);
  const caseMap = useMemo(() => new Map(bundle.questions.cases.map((c) => [c.id, c])), [bundle.questions.cases]);

  const startSession = (
    mode: ActiveSession['mode'],
    label: string,
    qs: Question[],
    opts: { instantFeedback: boolean; timedLimitSec: number | null }
  ) => {
    if (!qs.length) return;
    setSession({
      mode,
      label,
      questionUids: qs.map((q) => q.uid),
      answers: {},
      revealed: {},
      flagged: {},
      currentIdx: 0,
      instantFeedback: opts.instantFeedback,
      timedLimitSec: opts.timedLimitSec,
      elapsedSec: 0,
      submitted: false,
      recorded: false,
    });
    setShowNavGrid(false);
    setReviewFilter('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!launchIntent) return;
    if (launchIntent.mode === 'mock') {
      const mockQs = buildWeightedMockExam(bundle.meta, mergedQuestions);
      startSession('mock', `Full Mock Exam (${mockQs.length} câu)`, mockQs, {
        instantFeedback: false,
        timedLimitSec: (bundle.meta.examConfig.durationMinutes || 120) * 60,
      });
    } else if (launchIntent.mode === 'domain' && launchIntent.domainId) {
      setSelectedDomains([launchIntent.domainId]);
      const domQs = shuffleArray(mergedQuestions.filter((q) => q.domain === launchIntent.domainId));
      const picked = domQs.slice(0, Math.min(20, domQs.length));
      startSession('domain', `Luyện Domain ${launchIntent.domainId}`, picked, {
        instantFeedback: true,
        timedLimitSec: null,
      });
    } else if (launchIntent.mode === 'principle' && launchIntent.principle) {
      const pid = launchIntent.principle.id;
      const pQs = shuffleArray(mergedQuestions.filter((q) => q.principles.includes(pid)));
      if (pQs.length) {
        startSession(
          'principle',
          `Luyện nguyên tắc #${launchIntent.principle.number}: ${launchIntent.principle.title.en}`,
          pQs,
          { instantFeedback: true, timedLimitSec: null }
        );
      }
    } else if (launchIntent.mode === 'weakspots') {
      const weakQs = shuffleArray(getWeakSpotQuestions(mergedQuestions, progress));
      if (weakQs.length) {
        startSession('weakspots', `Weak-Spot Drill (${weakQs.length} câu sai)`, weakQs, {
          instantFeedback: true,
          timedLimitSec: null,
        });
      }
    }
    onConsumeIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchIntent]);

  const hasActiveSession = Boolean(session && !session.submitted);
  useEffect(() => {
    if (!hasActiveSession) return;
    const id = window.setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.submitted) return prev;
        const nextElapsed = prev.elapsedSec + 1;
        if (prev.timedLimitSec && nextElapsed >= prev.timedLimitSec) {
          return { ...prev, elapsedSec: prev.timedLimitSec, submitted: true };
        }
        return { ...prev, elapsedSec: nextElapsed };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [hasActiveSession]);

  useEffect(() => {
    if (!session || !session.submitted || session.recorded) return;

    const sessionQs = session.questionUids
      .map((uid) => questionMap.get(uid))
      .filter((q): q is Question => Boolean(q));

    const batch: { uid: string; isCorrect: boolean }[] = [];
    const domainBreakdown: Record<string, { total: number; correct: number }> = {};
    let correctCount = 0;

    for (const q of sessionQs) {
      const ans = session.answers[q.uid];
      const ok = gradeQuestion(q, ans);
      if (ok) correctCount++;
      if (!domainBreakdown[q.domain]) domainBreakdown[q.domain] = { total: 0, correct: 0 };
      domainBreakdown[q.domain].total++;
      if (ok) domainBreakdown[q.domain].correct++;
      if (!session.revealed[q.uid] && isAnswerComplete(q, ans)) {
        batch.push({ uid: q.uid, isCorrect: ok });
      }
    }

    if (batch.length) recordBatchResults(slug, batch);

    const scorePercent = sessionQs.length ? Math.round((correctCount / sessionQs.length) * 100) : 0;
    addExamHistory(slug, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode: session.mode,
      label: session.label,
      date: new Date().toISOString(),
      total: sessionQs.length,
      correct: correctCount,
      scorePercent,
      durationSec: session.elapsedSec,
      domainBreakdown,
      questionUids: session.questionUids,
      answers: session.answers,
    });
    setSession((prev) => (prev ? { ...prev, recorded: true } : prev));
  }, [session, questionMap, recordBatchResults, addExamHistory, slug]);

  const domainPracticePool = useMemo(() => {
    const domSet = new Set(selectedDomains);
    return mergedQuestions.filter((q) => {
      if (!domSet.has(q.domain)) return false;
      const stat = progress.questionStats[q.uid];
      if (practicePoolFilter === 'unanswered') return !stat;
      if (practicePoolFilter === 'wrong') return Boolean(stat && stat.wrongCount > 0 && !stat.resolvedWeakSpot);
      return true;
    });
  }, [mergedQuestions, selectedDomains, practicePoolFilter, progress.questionStats]);

  const toggleDomainSelection = (domainId: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domainId) ? prev.filter((id) => id !== domainId) : [...prev, domainId]
    );
  };

  const handleLaunchFullMock = () => {
    const mockQs = buildWeightedMockExam(bundle.meta, mergedQuestions);
    startSession('mock', `Full Mock Exam (${mockQs.length} câu)`, mockQs, {
      instantFeedback: false,
      timedLimitSec: (bundle.meta.examConfig.durationMinutes || 120) * 60,
    });
  };

  const handleLaunchDomainPractice = () => {
    const picked = shuffleArray(domainPracticePool).slice(
      0,
      practiceCount === 9999 ? domainPracticePool.length : Math.min(practiceCount, domainPracticePool.length)
    );
    const label =
      selectedDomains.length === bundle.meta.domains.length
        ? `Luyện tập tổng hợp (${picked.length} câu)`
        : `Luyện ${selectedDomains.join(', ')} (${picked.length} câu)`;
    startSession('domain', label, picked, { instantFeedback: practiceInstant, timedLimitSec: null });
  };

  const handleLaunchQuickDrill = (count: number) => {
    const picked = shuffleArray(mergedQuestions).slice(0, Math.min(count, mergedQuestions.length));
    startSession('quick', `Luyện nhanh (${picked.length} câu)`, picked, {
      instantFeedback: true,
      timedLimitSec: null,
    });
  };

  const handleReviewHistory = (entry: ExamHistoryEntry) => {
    const revealedAll: Record<string, boolean> = {};
    for (const uid of entry.questionUids) revealedAll[uid] = true;
    setSession({
      mode: entry.mode,
      label: entry.label,
      questionUids: entry.questionUids,
      answers: entry.answers || {},
      revealed: revealedAll,
      flagged: {},
      currentIdx: 0,
      instantFeedback: false,
      timedLimitSec: null,
      elapsedSec: entry.durationSec,
      submitted: true,
      recorded: true,
    });
    setReviewFilter('all');
  };

  if (!session) {
    if (mergedQuestions.length === 0) {
      return (
        <div className="surface-card p-8 text-center sm:p-12">
          <h2 className="text-xl font-bold">Ngân hàng câu hỏi cho {bundle.meta.code} chưa được nạp</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[var(--ink-secondary)]">
            File <code className="font-mono text-xs">public/data/{slug}/questions.json</code> hiện chưa có câu hỏi (do giới hạn rate-limit tạm thời từ nguồn). Bạn có thể chạy lại lệnh sau để nạp đủ câu hỏi:
          </p>
          <pre className="mx-auto mt-4 inline-block rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-4 py-2.5 font-mono text-xs text-[var(--accent-ink)]">
            npm run scrape -- {slug}
          </pre>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="surface-card flex flex-col justify-between p-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent-ink)]">
                <Timer className="h-3.5 w-3.5" />
                <span>Thi thử chuẩn đề thật</span>
              </div>
              <h2 className="mt-3 text-xl font-bold">Full Mock Exam</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
                Bốc câu hỏi đúng tỷ trọng từng Domain, đồng hồ đếm ngược như thi thật, đánh dấu câu phân vân và chấm điểm chi tiết theo từng Domain sau khi nộp bài.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                <div className="surface-subtle p-3">
                  <div className="text-[var(--ink-muted)]">Số câu</div>
                  <div className="mt-0.5 font-mono text-base font-bold">
                    {Math.min(bundle.meta.examConfig.totalQuestions, mergedQuestions.length)}
                  </div>
                </div>
                <div className="surface-subtle p-3">
                  <div className="text-[var(--ink-muted)]">Thời gian</div>
                  <div className="mt-0.5 font-mono text-base font-bold">
                    {bundle.meta.examConfig.durationMinutes} phút
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLaunchFullMock}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] dark:text-[#0f1115] cursor-pointer"
            >
              <Play className="h-4 w-4" />
              <span>Bắt đầu Full Mock Exam</span>
            </button>
          </div>

          <div className="surface-card flex flex-col justify-between p-6 lg:col-span-2">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--ink-secondary)]">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Tùy chỉnh theo mục tiêu</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDomains(
                      selectedDomains.length === bundle.meta.domains.length
                        ? []
                        : bundle.meta.domains.map((d) => d.id)
                    )
                  }
                  className="text-xs font-semibold text-[var(--accent-ink)] hover:underline cursor-pointer"
                >
                  {selectedDomains.length === bundle.meta.domains.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                </button>
              </div>
              <h2 className="mt-3 text-xl font-bold">Luyện theo Domain</h2>

              <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
                {bundle.meta.domains.map((d) => {
                  const checked = selectedDomains.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDomainSelection(d.id)}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition cursor-pointer ${
                        checked
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--ink-primary)]'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 text-[var(--ink-secondary)]'
                      }`}
                    >
                      <span className="truncate">
                        <span className="font-mono font-bold">{d.id}</span> · {d.name.en}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] opacity-80">{d.questionCount}Q</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[var(--ink-muted)]">Số câu:</span>
                  {[10, 20, 30, 9999].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPracticeCount(n)}
                      className={`rounded-lg px-2.5 py-1 font-mono font-semibold transition cursor-pointer ${
                        practiceCount === n
                          ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]'
                          : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                      }`}
                    >
                      {n === 9999 ? 'Tất cả' : n}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[var(--ink-muted)]">Nguồn:</span>
                  {(
                    [
                      ['all', 'Tất cả'],
                      ['unanswered', 'Chưa làm'],
                      ['wrong', 'Câu sai'],
                    ] as const
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPracticePoolFilter(val)}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer ${
                        practicePoolFilter === val
                          ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]'
                          : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-[var(--ink-secondary)]">
                  <input
                    type="checkbox"
                    checked={practiceInstant}
                    onChange={(e) => setPracticeInstant(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  <span>Xem giải thích ngay từng câu</span>
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-4">
              <span className="text-xs text-[var(--ink-muted)]">
                Kho phù hợp hiện có: <strong className="font-mono text-[var(--ink-primary)]">{domainPracticePool.length}</strong> câu
              </span>
              <button
                type="button"
                disabled={domainPracticePool.length === 0}
                onClick={handleLaunchDomainPractice}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-40 dark:text-[#0f1115] cursor-pointer disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4" />
                <span>Bắt đầu luyện Domain</span>
              </button>
            </div>
          </div>
        </div>

        <section className="surface-subtle flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-ink)]" />
            <div>
              <h3 className="text-base font-bold">Luyện nhanh (Quick Drill)</h3>
              <p className="text-xs text-[var(--ink-secondary)]">
                Chọn ngẫu nhiên từ toàn bộ {mergedQuestions.length} câu hỏi, xem đáp án và giải thích song ngữ ngay lập tức.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[10, 15, 25].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleLaunchQuickDrill(n)}
                className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-bold transition hover:border-[var(--accent)] hover:text-[var(--accent-ink)] cursor-pointer"
              >
                {n} câu ngay
              </button>
            ))}
          </div>
        </section>

        {progress.examHistory.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="h-4.5 w-4.5 text-[var(--accent-ink)]" />
              <h2 className="text-lg font-bold">Lịch sử các lần làm bài</h2>
            </div>
            <div className="surface-card divide-y divide-[var(--border-hairline)] overflow-hidden">
              {progress.examHistory.slice(0, 10).map((entry) => {
                const passed = entry.scorePercent >= 72;
                return (
                  <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <div className="text-sm font-semibold">{entry.label}</div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--ink-muted)]">
                        <span>{new Date(entry.date).toLocaleString('vi-VN')}</span>
                        <span className="font-mono">{formatDuration(entry.durationSec)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold ${
                          passed ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]'
                        }`}
                      >
                        {entry.correct}/{entry.total} ({entry.scorePercent}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReviewHistory(entry)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--bg-subtle)] cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Xem lại</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  const sessionQuestions = session.questionUids
    .map((uid) => questionMap.get(uid))
    .filter((q): q is Question => Boolean(q));

  if (session.submitted) {
    let totalCorrect = 0;
    const domainBreakdown: Record<string, { total: number; correct: number }> = {};
    for (const q of sessionQuestions) {
      const ok = gradeQuestion(q, session.answers[q.uid]);
      if (ok) totalCorrect++;
      if (!domainBreakdown[q.domain]) domainBreakdown[q.domain] = { total: 0, correct: 0 };
      domainBreakdown[q.domain].total++;
      if (ok) domainBreakdown[q.domain].correct++;
    }
    const pct = sessionQuestions.length ? Math.round((totalCorrect / sessionQuestions.length) * 100) : 0;
    const passed = pct >= 72;

    const reviewList = sessionQuestions.filter((q) => {
      if (reviewFilter === 'wrong') return !gradeQuestion(q, session.answers[q.uid]);
      if (reviewFilter === 'flagged') return Boolean(session.flagged[q.uid]);
      return true;
    });

    return (
      <div className="space-y-6">
        <section className="surface-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                  passed ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]'
                }`}
              >
                <Award className="h-8 w-8" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">{session.label}</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-mono text-3xl font-extrabold">{pct}%</span>
                  <span className="text-sm font-semibold text-[var(--ink-secondary)]">
                    {totalCorrect}/{sessionQuestions.length} câu đúng
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-[var(--ink-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Thời gian: {formatDuration(session.elapsedSec)}
                  </span>
                  <span>{passed ? 'Đạt ngưỡng mục tiêu (≥72%)' : 'Cần ôn thêm các câu sai'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSession(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] dark:text-[#0f1115] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Tạo bài thi mới</span>
            </button>
          </div>

          <div className="mt-6 grid gap-3 border-t border-[var(--border-hairline)] pt-5 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(domainBreakdown).map(([domId, stat]) => {
              const dPct = Math.round((stat.correct / stat.total) * 100);
              const domMeta = bundle.meta.domains.find((d) => d.id === domId);
              return (
                <div key={domId} className="surface-subtle p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{domId} {domMeta ? `· ${domMeta.name.en}` : ''}</span>
                    <span className={`font-mono ${dPct >= 72 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {dPct}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${dPct}%`, backgroundColor: dPct >= 72 ? 'var(--success)' : 'var(--danger)' }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-[var(--ink-muted)]">Đúng {stat.correct}/{stat.total} câu</div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Chi tiết từng câu ({reviewList.length})</h3>
          <div className="flex items-center gap-1.5">
            {(
              [
                ['all', `Tất cả (${sessionQuestions.length})`],
                ['wrong', `Câu sai (${sessionQuestions.length - totalCorrect})`],
                ['flagged', `Đã đánh dấu (${Object.values(session.flagged).filter(Boolean).length})`],
              ] as const
            ).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setReviewFilter(val)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  reviewFilter === val ? 'bg-[var(--accent)] text-white dark:text-[#0f1115]' : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {reviewList.map((q) => {
            const origIdx = sessionQuestions.findIndex((item) => item.uid === q.uid);
            return (
              <QuestionCard
                key={q.uid}
                question={q}
                caseStudy={q.caseId ? caseMap.get(q.caseId) : undefined}
                index={origIdx}
                total={sessionQuestions.length}
                answer={session.answers[q.uid]}
                revealAnswer={true}
                flagged={Boolean(session.flagged[q.uid])}
                hasOverride={Boolean(overrides.questions[q.uid])}
                onEditNote={() =>
                  setEditTarget({ kind: 'question', item: q, hasOverride: Boolean(overrides.questions[q.uid]) })
                }
                onJumpPrinciple={onJumpPrinciple}
              />
            );
          })}
        </div>

        <NoteEditModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaveQuestion={(uid, payload) => saveQuestionOverride(slug, uid, payload)}
          onResetQuestion={(uid) => resetQuestionOverride(slug, uid)}
        />
      </div>
    );
  }

  const currentQ = sessionQuestions[session.currentIdx];
  if (!currentQ) return null;

  const currentAns = session.answers[currentQ.uid];
  const isRevealed = Boolean(session.revealed[currentQ.uid]);
  const answeredCount = sessionQuestions.filter((q) => isAnswerComplete(q, session.answers[q.uid])).length;
  const remainingSec = session.timedLimitSec ? Math.max(0, session.timedLimitSec - session.elapsedSec) : null;
  const lowTime = remainingSec !== null && remainingSec < 300;

  const handleAnswerChange = (ans: UserAnswer) => {
    setSession((prev) => (prev ? { ...prev, answers: { ...prev.answers, [currentQ.uid]: ans } } : prev));
  };

  const handleCheckInstant = () => {
    if (!isAnswerComplete(currentQ, currentAns)) return;
    const ok = gradeQuestion(currentQ, currentAns);
    recordQuestionResult(slug, currentQ.uid, ok);
    setSession((prev) => (prev ? { ...prev, revealed: { ...prev.revealed, [currentQ.uid]: true } } : prev));
  };

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSession(null)}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] cursor-pointer"
          >
            ← Thoát
          </button>
          <span className="hidden text-sm font-bold sm:inline">{session.label}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-bold ${
              lowTime ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : 'bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{remainingSec !== null ? formatDuration(remainingSec) : formatDuration(session.elapsedSec)}</span>
          </div>

          <span className="font-mono text-xs text-[var(--ink-muted)]">
            {answeredCount}/{sessionQuestions.length} đã trả lời
          </span>

          <button
            type="button"
            onClick={() => setShowNavGrid((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              showNavGrid ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]' : 'border-[var(--border-hairline)] bg-[var(--bg-surface)]'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Danh sách câu</span>
          </button>

          <button
            type="button"
            onClick={() => setSession((prev) => (prev ? { ...prev, submitted: true } : prev))}
            className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[var(--accent-hover)] dark:text-[#0f1115] cursor-pointer"
          >
            Nộp bài
          </button>
        </div>
      </div>

      {showNavGrid && (
        <div className="surface-card p-4">
          <div className="mb-2.5 flex items-center justify-between text-xs text-[var(--ink-muted)]">
            <span className="font-semibold">Chuyển nhanh câu hỏi</span>
            <span>Xanh: đã làm · Vàng: đánh dấu</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12 md:grid-cols-15">
            {sessionQuestions.map((q, idx) => {
              const isCurrent = idx === session.currentIdx;
              const done = isAnswerComplete(q, session.answers[q.uid]);
              const isFlagged = Boolean(session.flagged[q.uid]);
              const revealedOk = session.revealed[q.uid] ? gradeQuestion(q, session.answers[q.uid]) : null;

              let btnStyle = 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)]';
              if (revealedOk === true) btnStyle = 'bg-[var(--success-soft)] text-[var(--success)]';
              else if (revealedOk === false) btnStyle = 'bg-[var(--danger-soft)] text-[var(--danger)]';
              else if (isFlagged) btnStyle = 'bg-[var(--warn-soft)] text-[var(--warn)]';
              else if (done) btnStyle = 'bg-[var(--accent-soft)] text-[var(--accent-ink)]';

              return (
                <button
                  key={q.uid}
                  type="button"
                  onClick={() => {
                    setSession((prev) => (prev ? { ...prev, currentIdx: idx } : prev));
                    setShowNavGrid(false);
                  }}
                  className={`h-8 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${btnStyle} ${
                    isCurrent ? 'ring-2 ring-[var(--accent)]' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <QuestionCard
        question={currentQ}
        caseStudy={currentQ.caseId ? caseMap.get(currentQ.caseId) : undefined}
        index={session.currentIdx}
        total={sessionQuestions.length}
        answer={currentAns}
        onChangeAnswer={handleAnswerChange}
        revealAnswer={isRevealed}
        flagged={Boolean(session.flagged[currentQ.uid])}
        onToggleFlag={() =>
          setSession((prev) =>
            prev ? { ...prev, flagged: { ...prev.flagged, [currentQ.uid]: !prev.flagged[currentQ.uid] } } : prev
          )
        }
        hasOverride={Boolean(overrides.questions[currentQ.uid])}
        onEditNote={() =>
          setEditTarget({ kind: 'question', item: currentQ, hasOverride: Boolean(overrides.questions[currentQ.uid]) })
        }
        onJumpPrinciple={onJumpPrinciple}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          disabled={session.currentIdx === 0}
          onClick={() =>
            setSession((prev) => (prev ? { ...prev, currentIdx: Math.max(0, prev.currentIdx - 1) } : prev))
          }
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Câu trước</span>
        </button>

        <div className="flex items-center gap-2">
          {session.instantFeedback && !isRevealed && (
            <button
              type="button"
              disabled={!isAnswerComplete(currentQ, currentAns)}
              onClick={handleCheckInstant}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-40 dark:text-[#0f1115] cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Kiểm tra đáp án</span>
            </button>
          )}

          {session.currentIdx < sessionQuestions.length - 1 ? (
            <button
              type="button"
              onClick={() =>
                setSession((prev) =>
                  prev ? { ...prev, currentIdx: Math.min(sessionQuestions.length - 1, prev.currentIdx + 1) } : prev
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <span>Câu tiếp</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSession((prev) => (prev ? { ...prev, submitted: true } : prev))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] dark:text-[#0f1115] cursor-pointer"
            >
              <span>Hoàn thành & Chấm điểm</span>
            </button>
          )}
        </div>
      </div>

      <NoteEditModal
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaveQuestion={(uid, payload) => saveQuestionOverride(slug, uid, payload)}
        onResetQuestion={(uid) => resetQuestionOverride(slug, uid)}
      />
    </div>
  );
}
