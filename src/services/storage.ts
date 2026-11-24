import type {
  CertOverrides,
  CertProgress,
  CheatsheetData,
  DecisionRule,
  KnowledgeData,
  LanguageMode,
  Principle,
  Question,
  QuestionsData,
  ThemeMode,
  UserBackupPayload,
} from '../types/cert';

const KEYS = {
  theme: 'certstudio:theme',
  language: 'certstudio:lang',
  progress: 'certstudio:progress:v1',
  overrides: 'certstudio:overrides:v1',
} as const;

export function createEmptyProgress(): CertProgress {
  return {
    readPrinciples: {},
    bookmarkedRules: {},
    questionStats: {},
    examHistory: [],
  };
}

export function createEmptyOverrides(): CertOverrides {
  return {
    principles: {},
    rules: {},
    questions: {},
  };
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

export function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(KEYS.theme);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
    // ignore
  }
}

export function loadLanguageMode(): LanguageMode {
  try {
    const saved = localStorage.getItem(KEYS.language);
    if (saved === 'en' || saved === 'bilingual' || saved === 'vi') return saved;
  } catch {
    // ignore
  }
  return 'bilingual';
}

export function saveLanguageMode(mode: LanguageMode): void {
  try {
    localStorage.setItem(KEYS.language, mode);
  } catch {
    // ignore
  }
}

export function loadAllProgress(): Record<string, CertProgress> {
  return safeReadJson<Record<string, CertProgress>>(KEYS.progress, {});
}

export function saveAllProgress(data: Record<string, CertProgress>): void {
  safeWriteJson(KEYS.progress, data);
}

export function loadAllOverrides(): Record<string, CertOverrides> {
  return safeReadJson<Record<string, CertOverrides>>(KEYS.overrides, {});
}

export function saveAllOverrides(data: Record<string, CertOverrides>): void {
  safeWriteJson(KEYS.overrides, data);
}

export function mergePrinciple(principle: Principle, overrides?: CertOverrides): Principle {
  const ov = overrides?.principles?.[principle.id];
  if (!ov) return principle;
  return {
    ...principle,
    title: {
      en: ov.title?.en ?? principle.title.en,
      vi: ov.title?.vi ?? principle.title.vi,
    },
    body: {
      en: ov.body?.en ?? principle.body.en,
      vi: ov.body?.vi ?? principle.body.vi,
    },
    personal_notes: ov.personal_notes ?? principle.personal_notes ?? '',
  };
}

export function mergeRule(rule: DecisionRule, overrides?: CertOverrides): DecisionRule {
  const ov = overrides?.rules?.[rule.id];
  if (!ov) return rule;
  return {
    ...rule,
    situation: {
      en: ov.situation?.en ?? rule.situation.en,
      vi: ov.situation?.vi ?? rule.situation.vi,
    },
    choice: {
      en: ov.choice?.en ?? rule.choice.en,
      vi: ov.choice?.vi ?? rule.choice.vi,
    },
    personal_notes: ov.personal_notes ?? rule.personal_notes ?? '',
  };
}

export function mergeQuestion(question: Question, overrides?: CertOverrides): Question {
  const ov = overrides?.questions?.[question.uid];
  if (!ov) return question;
  return {
    ...question,
    question: {
      en: ov.question?.en ?? question.question.en,
      vi: ov.question?.vi ?? question.question.vi,
    },
    explanation: {
      en: ov.explanation?.en ?? question.explanation.en,
      vi: ov.explanation?.vi ?? question.explanation.vi,
    },
    options: question.options?.map((opt) => ({
      ...opt,
      en: ov.options?.[opt.key]?.en ?? opt.en,
      vi: ov.options?.[opt.key]?.vi ?? opt.vi,
    })),
    personal_notes: ov.personal_notes ?? question.personal_notes ?? '',
  };
}

export function buildUpdatedKnowledgeJson(
  data: KnowledgeData,
  overrides?: CertOverrides
): KnowledgeData {
  return {
    ...data,
    domains: data.domains.map((d) => ({
      ...d,
      principles: d.principles.map((p) => mergePrinciple(p, overrides)),
    })),
  };
}

export function buildUpdatedCheatsheetJson(
  data: CheatsheetData,
  overrides?: CertOverrides
): CheatsheetData {
  return {
    ...data,
    rules: data.rules.map((r) => mergeRule(r, overrides)),
  };
}

export function buildUpdatedQuestionsJson(
  data: QuestionsData,
  overrides?: CertOverrides
): QuestionsData {
  return {
    ...data,
    questions: data.questions.map((q) => mergeQuestion(q, overrides)),
  };
}

export function downloadJsonFile(filename: string, payload: unknown): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseBackupFile(raw: string): UserBackupPayload {
  const parsed = JSON.parse(raw) as Partial<UserBackupPayload>;
  if (!parsed || typeof parsed !== 'object' || parsed.schemaVersion !== 1) {
    throw new Error('File backup không đúng định dạng CertStudio (schemaVersion !== 1).');
  }
  return {
    schemaVersion: 1,
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    languageMode:
      parsed.languageMode === 'en' || parsed.languageMode === 'vi' || parsed.languageMode === 'bilingual'
        ? parsed.languageMode
        : 'bilingual',
    theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : 'light',
    progressByCert: parsed.progressByCert || {},
    overridesByCert: parsed.overridesByCert || {},
  };
}

export function mergeBackupData(
  currentProgress: Record<string, CertProgress>,
  currentOverrides: Record<string, CertOverrides>,
  incoming: UserBackupPayload
): {
  progressByCert: Record<string, CertProgress>;
  overridesByCert: Record<string, CertOverrides>;
} {
  const nextProgress: Record<string, CertProgress> = { ...currentProgress };
  for (const [slug, incP] of Object.entries(incoming.progressByCert)) {
    const cur = nextProgress[slug] || createEmptyProgress();
    const mergedHistoryIds = new Set(cur.examHistory.map((h) => h.id));
    const mergedHistory = [
      ...cur.examHistory,
      ...(incP.examHistory || []).filter((h) => !mergedHistoryIds.has(h.id)),
    ].sort((a, b) => b.date.localeCompare(a.date));

    nextProgress[slug] = {
      readPrinciples: { ...cur.readPrinciples, ...(incP.readPrinciples || {}) },
      bookmarkedRules: { ...cur.bookmarkedRules, ...(incP.bookmarkedRules || {}) },
      questionStats: { ...cur.questionStats, ...(incP.questionStats || {}) },
      examHistory: mergedHistory,
    };
  }

  const nextOverrides: Record<string, CertOverrides> = { ...currentOverrides };
  for (const [slug, incO] of Object.entries(incoming.overridesByCert)) {
    const cur = nextOverrides[slug] || createEmptyOverrides();
    nextOverrides[slug] = {
      principles: { ...cur.principles, ...(incO.principles || {}) },
      rules: { ...cur.rules, ...(incO.rules || {}) },
      questions: { ...cur.questions, ...(incO.questions || {}) },
    };
  }

  return { progressByCert: nextProgress, overridesByCert: nextOverrides };
}
