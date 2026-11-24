import type { CertMeta, LanguageMode, Principle, Question, UserAnswer } from '../../types/cert';

export interface AIStudyRequest {
  kind: 'explain_mistake' | 'deep_dive_principle' | 'mnemonic' | 'socratic_hint';
  cert: Pick<CertMeta, 'slug' | 'code' | 'name'>;
  language: LanguageMode;
  principle?: Principle;
  question?: Question;
  userAnswer?: UserAnswer;
  customPrompt?: string;
}

export interface AIStudyResponse {
  markdown: string;
  provider: string;
  generatedAt: string;
}

export interface AIAssistantAdapter {
  id: string;
  name: string;
  isConfigured(): boolean;
  ask(request: AIStudyRequest): Promise<AIStudyResponse>;
}

export function buildStudyPromptContext(req: AIStudyRequest): string {
  const lines = [
    `Certification: ${req.cert.code} — ${req.cert.name.en}`,
    `Preferred language mode: ${req.language}`,
    `Task: ${req.kind}`,
  ];
  if (req.principle) {
    lines.push(
      `\nPrinciple #${req.principle.number} (${req.principle.domainId}): ${req.principle.title.en}`,
      `EN: ${req.principle.body.en}`,
      `VI: ${req.principle.body.vi}`
    );
    if (req.principle.personal_notes) lines.push(`Personal Notes: ${req.principle.personal_notes}`);
  }
  if (req.question) {
    lines.push(
      `\nQuestion (${req.question.uid}, Domain ${req.question.domain}):`,
      `EN: ${req.question.question.en}`,
      `VI: ${req.question.question.vi}`,
      `Explanation: ${req.question.explanation.en}`
    );
    if (req.userAnswer !== undefined) lines.push(`User Answer: ${JSON.stringify(req.userAnswer)}`);
    if (req.question.personal_notes) lines.push(`Personal Notes: ${req.question.personal_notes}`);
  }
  if (req.customPrompt) lines.push(`\nAdditional Instruction: ${req.customPrompt}`);
  return lines.join('\n');
}
