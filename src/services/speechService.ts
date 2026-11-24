import type { LanguageMode, Principle } from '../types/cert';

export type SpeechStyle = 'lecture' | 'read';

export interface SpeechSegment {
  text: string;
  lang: 'en-US' | 'vi-VN';
}

function splitIntoChunks(text: string, maxLen = 190): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const sentences = cleaned.split(/(?<=[.!?。;:])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if (!s) continue;
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current ? current + ' ' : '') + s;
    } else {
      if (current) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        // Hard-split very long sentences by comma or spaces
        const words = s.split(' ');
        let part = '';
        for (const w of words) {
          if ((part + ' ' + w).trim().length <= maxLen) {
            part = (part ? part + ' ' : '') + w;
          } else {
            if (part) chunks.push(part);
            part = w;
          }
        }
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Builds spoken segments for either "Read Aloud" or "Lecture" (giảng bài) mode.
 */
export function buildPrincipleSpeechSegments(
  principle: Principle,
  languageMode: LanguageMode,
  style: SpeechStyle
): SpeechSegment[] {
  const segments: SpeechSegment[] = [];
  const titleEn = principle.title.en?.trim() || '';
  const titleVi = principle.title.vi?.trim() || '';
  const bodyEn = principle.body.en?.trim() || '';
  const bodyVi = principle.body.vi?.trim() || '';
  const note = principle.personal_notes?.trim() || '';

  const pushChunks = (text: string, lang: 'en-US' | 'vi-VN') => {
    for (const chunk of splitIntoChunks(text)) {
      segments.push({ text: chunk, lang });
    }
  };

  if (style === 'read') {
    if (languageMode === 'en') {
      pushChunks(`Principle ${principle.number}. ${titleEn}.`, 'en-US');
      pushChunks(bodyEn, 'en-US');
    } else if (languageMode === 'vi') {
      pushChunks(`Nguyên tắc số ${principle.number}. ${titleVi || titleEn}.`, 'vi-VN');
      pushChunks(bodyVi || bodyEn, 'vi-VN');
    } else {
      pushChunks(`Principle ${principle.number}. ${titleEn}.`, 'en-US');
      pushChunks(bodyEn, 'en-US');
      if (bodyVi && bodyVi !== bodyEn) {
        pushChunks(`Giải thích tiếng Việt: ${bodyVi}`, 'vi-VN');
      }
    }
    if (note) {
      pushChunks(`Ghi chú cá nhân của bạn: ${note}`, 'vi-VN');
    }
    return segments;
  }

  // Lecture ("Giảng bài") mode — conversational, structured explanation
  if (languageMode === 'en') {
    pushChunks(`Let's cover Principle ${principle.number}: ${titleEn}.`, 'en-US');
    pushChunks(`Here is the key idea you need for the exam. ${bodyEn}`, 'en-US');
    if (note) {
      pushChunks(`Your personal reminder: ${note}`, 'en-US');
    }
    return segments;
  }

  // VI or Bilingual Lecture (Vietnamese teacher explaining English exam terms clearly)
  const introTitle =
    titleVi && titleVi !== titleEn
      ? `${titleEn}, tức là ${titleVi}`
      : titleEn || titleVi;

  pushChunks(`Nguyên tắc số ${principle.number}: ${introTitle}.`, 'vi-VN');

  const mainVi = bodyVi || bodyEn;
  const trapMatch = mainVi.match(/(?:Bẫy:|Traps?:|Lưu ý:)\s*(.+)$/i);
  if (trapMatch) {
    const core = mainVi.slice(0, trapMatch.index).trim();
    const trap = trapMatch[1].trim();
    if (core) pushChunks(`Hiểu cốt lõi như sau: ${core}`, 'vi-VN');
    pushChunks(`Điểm bẫy rất hay gặp khi đi thi cần tránh: ${trap}`, 'vi-VN');
  } else {
    pushChunks(`Tóm tắt trọng tâm đi thi: ${mainVi}`, 'vi-VN');
  }

  if (languageMode === 'bilingual' && bodyEn && bodyEn !== bodyVi) {
    pushChunks(`In English exam phrasing: ${bodyEn}`, 'en-US');
  }

  if (note) {
    pushChunks(`Lưu ý riêng bạn đã ghi chú: ${note}`, 'vi-VN');
  }

  return segments;
}

export function pickBestVoice(voices: SpeechSynthesisVoice[], lang: 'en-US' | 'vi-VN'): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const prefix = lang === 'vi-VN' ? 'vi' : 'en';
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  if (!matching.length) return null;

  // Prefer enhanced / natural / Google / Apple Siri voices
  const preferred = matching.find((v) =>
    /google|natural|enhanced|premium|linh|samantha|daniel|alex/i.test(v.name)
  );
  return preferred || matching[0];
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
