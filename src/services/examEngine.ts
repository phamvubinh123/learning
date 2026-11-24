import type { CertMeta, CertProgress, Question, UserAnswer } from '../types/cert';

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function isAnswerComplete(question: Question, answer: UserAnswer | undefined): boolean {
  if (answer === undefined || answer === null) return false;
  switch (question.type) {
    case 'single':
      return typeof answer === 'string' && answer.length > 0;
    case 'multi':
    case 'hotspot': {
      if (!Array.isArray(answer)) return false;
      const required = question.select || (Array.isArray(question.correct) ? question.correct.length : 1);
      return answer.length >= required;
    }
    case 'dropdown': {
      if (typeof answer !== 'object' || Array.isArray(answer)) return false;
      const blanks = question.blanks || [];
      return blanks.length > 0 && blanks.every((b) => typeof answer[b.id] === 'number');
    }
    default:
      return false;
  }
}

export function gradeQuestion(question: Question, answer: UserAnswer | undefined): boolean {
  if (!isAnswerComplete(question, answer)) return false;
  switch (question.type) {
    case 'single':
      return typeof answer === 'string' && answer === question.correct;
    case 'multi':
    case 'hotspot': {
      if (!Array.isArray(answer)) return false;
      const expected = Array.isArray(question.correct)
        ? [...question.correct].sort()
        : question.correct
          ? [question.correct]
          : [];
      const actual = [...answer].sort();
      return expected.length === actual.length && expected.every((v, idx) => v === actual[idx]);
    }
    case 'dropdown': {
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
      const blanks = question.blanks || [];
      return blanks.length > 0 && blanks.every((b) => answer[b.id] === b.correct);
    }
    default:
      return false;
  }
}

export function buildWeightedMockExam(meta: CertMeta, questions: Question[], targetCount?: number): Question[] {
  const count = Math.min(targetCount || meta.examConfig.totalQuestions || 60, questions.length);
  const byDomain = new Map<string, Question[]>();
  for (const q of questions) {
    const list = byDomain.get(q.domain) || [];
    list.push(q);
    byDomain.set(q.domain, list);
  }

  const totalWeight = meta.domains.reduce((sum, d) => sum + (d.weight || 0), 0);
  if (totalWeight <= 0) {
    return shuffleArray(questions).slice(0, count);
  }

  const selected: Question[] = [];
  const selectedIds = new Set<string>();

  for (const domain of meta.domains) {
    const pool = shuffleArray(byDomain.get(domain.id) || []);
    const quota = Math.round((domain.weight / totalWeight) * count);
    for (const q of pool.slice(0, quota)) {
      if (selected.length < count && !selectedIds.has(q.uid)) {
        selected.push(q);
        selectedIds.add(q.uid);
      }
    }
  }

  if (selected.length < count) {
    const remaining = shuffleArray(questions.filter((q) => !selectedIds.has(q.uid)));
    for (const q of remaining) {
      if (selected.length >= count) break;
      selected.push(q);
      selectedIds.add(q.uid);
    }
  }

  return shuffleArray(selected);
}

export function getWeakSpotQuestions(questions: Question[], progress: CertProgress): Question[] {
  return questions.filter((q) => {
    const stat = progress.questionStats[q.uid];
    if (!stat) return false;
    return stat.wrongCount > 0 && !stat.resolvedWeakSpot;
  });
}

export function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
