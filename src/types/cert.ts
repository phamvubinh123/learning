export type LanguageMode = 'en' | 'bilingual' | 'vi';

export type ThemeMode = 'light' | 'dark';

export type CertTab = 'overview' | 'knowledge' | 'cheatsheet' | 'exam' | 'weakspots';

export interface BilingualText {
  en: string;
  vi: string;
}

export interface ExamConfig {
  totalQuestions: number;
  durationMinutes: number;
  passingScore: string;
  passingDetail: string;
  fee: string;
  validity: string;
  delivery: string;
}

export interface CertStats {
  domains: number;
  principles: number;
  rules: number;
  glossary: number;
  questions: number;
}

export interface CertCatalogItem {
  slug: string;
  certId: string;
  code: string;
  name: BilingualText;
  tagline: BilingualText;
  provider: string;
  category: string;
  accent: string;
  badge: string | null;
  examConfig: ExamConfig;
  stats: CertStats;
  scrapedAt: string;
}

export interface CatalogData {
  generatedAt: string;
  certifications: CertCatalogItem[];
}

export interface ExamFact {
  label: BilingualText;
  value: BilingualText;
  detail: BilingualText;
}

export interface DomainMeta {
  id: string;
  code: string;
  weight: number;
  name: BilingualText;
  description: BilingualText;
  principleCount: number;
  questionCount: number;
}

export interface StudyPhase {
  phase: string;
  title: BilingualText;
  steps: BilingualText[];
}

export interface CertFaq {
  question: BilingualText;
  answer: BilingualText;
}

export interface CertMeta {
  slug: string;
  certId: string;
  code: string;
  name: BilingualText;
  tagline: BilingualText;
  provider: string;
  category: string;
  accent: string;
  badge: string | null;
  examConfig: ExamConfig;
  examFacts: ExamFact[];
  factsSource: { label: string; url: string } | null;
  domains: DomainMeta[];
  studyPlan: StudyPhase[];
  guide: {
    title: BilingualText;
    intro: BilingualText;
  };
  faqs: CertFaq[];
  stats: CertStats;
  sourceUrl: string;
  scrapedAt: string;
}

export interface Principle {
  id: string;
  number: number;
  domainId: string;
  title: BilingualText;
  body: BilingualText;
  questionCount: number;
  personal_notes?: string;
}

export interface KnowledgeDomain {
  id: string;
  code: string;
  weight: number;
  name: BilingualText;
  description: BilingualText;
  principles: Principle[];
}

export interface KnowledgeData {
  slug: string;
  certId: string;
  scrapedAt: string;
  domains: KnowledgeDomain[];
}

export interface DecisionRule {
  id: string;
  index: string;
  situation: BilingualText;
  choice: BilingualText;
  personal_notes?: string;
}

export interface VocabItem {
  id: string;
  term: string;
  meaning: BilingualText;
}

export interface GlossaryItem {
  id: string;
  letter: string;
  term: string;
  definition: BilingualText;
}

export interface CheatsheetData {
  slug: string;
  certId: string;
  scrapedAt: string;
  rules: DecisionRule[];
  vocabulary: VocabItem[];
  glossary: GlossaryItem[];
}

export interface QuestionOption {
  key: string;
  en: string;
  vi: string;
}

export interface DropdownBlank {
  id: string;
  label: BilingualText;
  options: { index: number; en: string; vi: string }[];
  correct: number;
}

export interface HotspotRegion {
  id: string;
  shape: string;
  coords: number[];
  label: BilingualText;
}

export interface HotspotImage {
  src: string;
  w: number;
  h: number;
  alt: BilingualText;
}

export type QuestionType = 'single' | 'multi' | 'dropdown' | 'hotspot';

export interface Question {
  uid: string;
  type: QuestionType;
  set: string | null;
  domain: string;
  principles: string[];
  caseId: string | null;
  provenance: string | null;
  question: BilingualText;
  explanation: BilingualText;
  options?: QuestionOption[];
  correct: string | string[] | null;
  select: number | null;
  layout?: string | null;
  blanks?: DropdownBlank[];
  image?: HotspotImage | null;
  regions?: HotspotRegion[];
  personal_notes?: string;
}

export interface CaseStudy {
  id: string;
  title: BilingualText;
  body: BilingualText;
}

export interface QuestionsData {
  slug: string;
  certId: string;
  scrapedAt: string;
  totalCount: number;
  cases: CaseStudy[];
  questions: Question[];
}

export interface CertBundle {
  meta: CertMeta;
  knowledge: KnowledgeData;
  cheatsheet: CheatsheetData;
  questions: QuestionsData;
}

export type UserAnswer =
  | string
  | string[]
  | Record<string, number>;

export interface QuestionAttemptStat {
  attempts: number;
  correctCount: number;
  wrongCount: number;
  lastCorrect: boolean;
  lastAnsweredAt: string;
  resolvedWeakSpot?: boolean;
}

export interface ExamHistoryEntry {
  id: string;
  mode: 'mock' | 'domain' | 'quick' | 'weakspots' | 'principle';
  label: string;
  date: string;
  total: number;
  correct: number;
  scorePercent: number;
  durationSec: number;
  domainBreakdown: Record<string, { total: number; correct: number }>;
  questionUids: string[];
  answers: Record<string, UserAnswer>;
}

export interface CertProgress {
  readPrinciples: Record<string, boolean>;
  bookmarkedRules: Record<string, boolean>;
  questionStats: Record<string, QuestionAttemptStat>;
  examHistory: ExamHistoryEntry[];
}

export interface PrincipleOverride {
  title?: Partial<BilingualText>;
  body?: Partial<BilingualText>;
  personal_notes?: string;
  updatedAt: string;
}

export interface RuleOverride {
  situation?: Partial<BilingualText>;
  choice?: Partial<BilingualText>;
  personal_notes?: string;
  updatedAt: string;
}

export interface QuestionOverride {
  question?: Partial<BilingualText>;
  explanation?: Partial<BilingualText>;
  options?: Record<string, Partial<BilingualText>>;
  personal_notes?: string;
  updatedAt: string;
}

export interface CertOverrides {
  principles: Record<string, PrincipleOverride>;
  rules: Record<string, RuleOverride>;
  questions: Record<string, QuestionOverride>;
}

export interface UserBackupPayload {
  schemaVersion: 1;
  exportedAt: string;
  languageMode: LanguageMode;
  theme: ThemeMode;
  progressByCert: Record<string, CertProgress>;
  overridesByCert: Record<string, CertOverrides>;
}
