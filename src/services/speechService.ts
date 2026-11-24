import type { LanguageMode, Principle } from '../types/cert';

export type SpeechStyle = 'lecture' | 'read';

export interface SpeechSegment {
  text: string;
  lang: 'en-US' | 'vi-VN';
}

const VI_DIACRITIC_RE =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/;

// Common unaccented Vietnamese function/content words so they stay in vi-VN
const COMMON_VI_ASCII_WORDS = new Set([
  'ai', 'an', 'anh', 'ba', 'ban', 'bao', 'bay', 'be', 'ben', 'bi', 'binh', 'bo', 'boi', 'bon',
  'buoc', 'ca', 'cac', 'cai', 'can', 'cao', 'cap', 'cat', 'cau', 'cay', 'cha', 'chat', 'che',
  'chi', 'chia', 'chinh', 'cho', 'chon', 'chu', 'chua', 'chuan', 'chung', 'chuyen', 'co', 'con',
  'cong', 'cu', 'cua', 'cung', 'cuoi', 'da', 'dan', 'dang', 'danh', 'dao', 'dat', 'dau', 'day',
  'de', 'dem', 'den', 'deu', 'di', 'dich', 'diem', 'dien', 'dieu', 'dinh', 'do', 'doa', 'doc',
  'doi', 'don', 'dong', 'du', 'dua', 'duc', 'dung', 'duoc', 'duoi', 'duong', 'em', 'ga', 'gan',
  'gap', 'gat', 'gay', 'ghi', 'gia', 'giai', 'giam', 'gian', 'giao', 'giat', 'giay', 'gio',
  'gioi', 'giu', 'giua', 'giup', 'goi', 'gom', 'gop', 'ha', 'hai', 'ham', 'han', 'hang', 'hao',
  'hay', 'he', 'het', 'hien', 'hieu', 'hinh', 'ho', 'hoa', 'hoac', 'hoan', 'hoat', 'hoc', 'hoi',
  'hon', 'hop', 'huong', 'ich', 'it', 'ke', 'kem', 'keo', 'ket', 'kha', 'khac', 'khai', 'kham',
  'khao', 'khau', 'kheo', 'khi', 'khien', 'kho', 'khoa', 'khoan', 'khoi', 'khong', 'khu', 'khung',
  'khuyen', 'kiem', 'kien', 'kieu', 'kim', 'kinh', 'ky', 'la', 'lai', 'lam', 'lan', 'lang', 'lao',
  'lap', 'lay', 'le', 'len', 'lich', 'lien', 'lieu', 'linh', 'lo', 'loai', 'loc', 'loi', 'lon',
  'long', 'lop', 'lu', 'lua', 'luan', 'luat', 'luc', 'lui', 'luon', 'luong', 'luot', 'luu', 'ly',
  'ma', 'mai', 'man', 'mang', 'manh', 'mat', 'mau', 'may', 'me', 'men', 'met', 'mien', 'minh',
  'mo', 'moi', 'mon', 'mong', 'mot', 'mua', 'muc', 'mui', 'muon', 'my', 'na', 'nam', 'nang',
  'nao', 'nay', 'ne', 'nem', 'nen', 'neu', 'nga', 'ngai', 'ngan', 'ngang', 'ngay', 'nghe', 'nghi',
  'nghia', 'nghin', 'ngo', 'ngoai', 'ngon', 'ngu', 'nguc', 'ngui', 'ngung', 'nguoc', 'nguoi',
  'nguon', 'nha', 'nhac', 'nham', 'nhan', 'nhanh', 'nhap', 'nhat', 'nhau', 'nhe', 'nhieu', 'nhiem',
  'nhin', 'nhip', 'nho', 'nhom', 'nhu', 'nhung', 'nhuoc', 'niem', 'nien', 'no', 'noi', 'nom',
  'nong', 'nu', 'nua', 'nuc', 'nuoc', 'nuoi', 'o', 'on', 'ong', 'pha', 'phai', 'pham', 'phan',
  'phap', 'phat', 'phe', 'phep', 'phi', 'phia', 'phien', 'phim', 'pho', 'phoi', 'phong', 'phu',
  'phuc', 'phung', 'phuoc', 'phuong', 'phut', 'qua', 'quan', 'quang', 'quanh', 'quay', 'quen',
  'quet', 'quy', 'quyen', 'quyet', 'ra', 'rac', 'ran', 'rang', 'ranh', 'rat', 're', 'ren', 'rieng',
  'ro', 'roi', 'rong', 'rot', 'ru', 'rui', 'rung', 'rut', 'sa', 'sach', 'sai', 'san', 'sang',
  'sanh', 'sao', 'sat', 'sau', 'se', 'sen', 'si', 'sinh', 'so', 'soa', 'soan', 'soat', 'soc',
  'soi', 'som', 'song', 'su', 'sua', 'suc', 'sui', 'sung', 'suot', 'suy', 'ta', 'tac', 'tai',
  'tam', 'tan', 'tang', 'tao', 'tap', 'tat', 'tau', 'tay', 'te', 'ten', 'tha', 'thai', 'tham',
  'than', 'thang', 'thanh', 'thao', 'thap', 'that', 'thau', 'thay', 'the', 'them', 'theo', 'thep',
  'thi', 'thich', 'thien', 'thiet', 'thieu', 'thinh', 'tho', 'thoa', 'thoai', 'thoi', 'thon',
  'thong', 'thu', 'thua', 'thuan', 'thuat', 'thuc', 'thue', 'thui', 'thung', 'thuoc', 'thuong',
  'thuy', 'ti', 'tia', 'tich', 'tien', 'tiep', 'tiet', 'tieu', 'tim', 'tin', 'tinh', 'to', 'toa',
  'toan', 'toc', 'toi', 'ton', 'tong', 'tot', 'tra', 'trach', 'trai', 'tram', 'tran', 'trang',
  'tranh', 'trao', 'trat', 'tre', 'tren', 'tri', 'trien', 'trieu', 'trinh', 'tro', 'troi', 'trong',
  'tru', 'truc', 'trung', 'truoc', 'truong', 'truyen', 'tu', 'tua', 'tuan', 'tuc', 'tue', 'tui',
  'tung', 'tuoi', 'tuong', 'tuy', 'tuyen', 'tuyet', 'u', 'ua', 'uoc', 'uu', 'va', 'vai', 'van',
  'vang', 'vao', 'vat', 'vay', 've', 'ven', 'vet', 'vi', 'vic', 'vien', 'viet', 'vinh', 'vo',
  'voi', 'von', 'vong', 'vu', 'vua', 'vuc', 'vui', 'vung', 'vuong', 'vuot', 'xa', 'xac', 'xam',
  'xanh', 'xao', 'xau', 'xay', 'xe', 'xem', 'xep', 'xet', 'xin', 'xinh', 'xo', 'xoa', 'xong',
  'xu', 'xua', 'xuat', 'xuc', 'xung', 'xuong', 'xuoi', 'xuyen', 'y', 'yeu',
]);

function normalizeTextForSpeech(raw: string): string {
  return raw
    .replace(/→/g, ', sang ')
    .replace(/—|–/g, ', ')
    .replace(/\bvd\b/gi, 'ví dụ')
    .replace(/\bvs\b/gi, 'so với')
    .replace(/\be\.g\.,?/gi, 'for example,')
    .replace(/\bi\.e\.,?/gi, 'that is,')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyEnglishToken(token: string): boolean {
  const clean = token.replace(/^[^a-zA-Z0-9_.-]+|[^a-zA-Z0-9_.-]+$/g, '');
  if (!clean) return false;
  if (VI_DIACRITIC_RE.test(clean)) return false;
  // Numbers/punctuation alone don't need voice switch
  if (/^\d+([.,]\d+)?%?$/.test(clean)) return false;
  // Must contain at least 2 ASCII letters or camelCase / dot-file / acronym
  if (!/[a-zA-Z]{2,}/.test(clean)) return false;
  if (COMMON_VI_ASCII_WORDS.has(clean.toLowerCase())) return false;
  return true;
}

/**
 * Splits a Vietnamese sentence containing embedded English technical terms
 * into alternating vi-VN and en-US speech segments so each language is
 * pronounced by its native voice.
 */
export function splitMixedBilingualText(text: string): SpeechSegment[] {
  const normalized = normalizeTextForSpeech(text);
  if (!normalized) return [];

  const tokens = normalized.split(/\s+/);
  const segments: SpeechSegment[] = [];
  let currentLang: 'en-US' | 'vi-VN' | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!buffer.length || !currentLang) return;
    const joined = buffer.join(' ').trim();
    if (joined) segments.push({ text: joined, lang: currentLang });
    buffer = [];
  };

  for (const token of tokens) {
    const isEn = isLikelyEnglishToken(token);
    const tokenLang: 'en-US' | 'vi-VN' = isEn ? 'en-US' : 'vi-VN';

    // Keep short punctuation-only tokens attached to current buffer
    if (/^[,.;:!?()\[\]"'-]+$/.test(token) && currentLang) {
      buffer.push(token);
      continue;
    }

    if (currentLang === null) {
      currentLang = tokenLang;
      buffer.push(token);
    } else if (tokenLang === currentLang) {
      buffer.push(token);
    } else {
      flush();
      currentLang = tokenLang;
      buffer.push(token);
    }
  }
  flush();

  // Merge tiny 1-word oscillations if needed? No, keeping 1 English term in en-US is the whole point!
  // Just ensure each segment respects max chunk length (190 chars)
  const chunked: SpeechSegment[] = [];
  for (const seg of segments) {
    for (const chunk of splitIntoChunks(seg.text, 190)) {
      chunked.push({ text: chunk, lang: seg.lang });
    }
  }
  return chunked;
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

  const pushEn = (text: string) => {
    for (const chunk of splitIntoChunks(normalizeTextForSpeech(text))) {
      segments.push({ text: chunk, lang: 'en-US' });
    }
  };

  const pushViMixed = (text: string) => {
    segments.push(...splitMixedBilingualText(text));
  };

  if (style === 'read') {
    if (languageMode === 'en') {
      pushEn(`Principle ${principle.number}. ${titleEn}.`);
      pushEn(bodyEn);
    } else if (languageMode === 'vi') {
      pushViMixed(`Nguyên tắc số ${principle.number}. ${titleVi || titleEn}.`);
      pushViMixed(bodyVi || bodyEn);
    } else {
      pushEn(`Principle ${principle.number}. ${titleEn}.`);
      pushEn(bodyEn);
      if (bodyVi && bodyVi !== bodyEn) {
        pushViMixed(`Giải thích tiếng Việt: ${bodyVi}`);
      }
    }
    if (note) pushViMixed(`Ghi chú cá nhân của bạn: ${note}`);
    return segments;
  }

  // Lecture ("Giảng bài") mode
  if (languageMode === 'en') {
    pushEn(`Let's cover Principle ${principle.number}: ${titleEn}.`);
    pushEn(`Here is the key idea you need for the exam. ${bodyEn}`);
    if (note) pushEn(`Your personal reminder: ${note}`);
    return segments;
  }

  pushViMixed(`Nguyên tắc số ${principle.number}: ${titleEn}.`);
  if (titleVi && titleVi !== titleEn) {
    pushViMixed(`Tức là ${titleVi}.`);
  }

  const mainVi = bodyVi || bodyEn;
  const trapMatch = mainVi.match(/(?:Bẫy:|Traps?:|Lưu ý:)\s*(.+)$/i);
  if (trapMatch) {
    const core = mainVi.slice(0, trapMatch.index).trim();
    const trap = trapMatch[1].trim();
    if (core) pushViMixed(`Hiểu cốt lõi như sau: ${core}`);
    pushViMixed(`Điểm bẫy rất hay gặp khi đi thi cần tránh: ${trap}`);
  } else {
    pushViMixed(`Tóm tắt trọng tâm đi thi: ${mainVi}`);
  }

  if (languageMode === 'bilingual' && bodyEn && bodyEn !== bodyVi) {
    pushEn(`In English exam phrasing: ${bodyEn}`);
  }

  if (note) pushViMixed(`Lưu ý riêng bạn đã ghi chú: ${note}`);
  return segments;
}

/**
 * Builds a single natural script for neural cloud TTS (OpenAI TTS handles
 * mixed Vietnamese + English fluently in one voice!).
 */
export function buildLectureScript(
  principle: Principle,
  languageMode: LanguageMode,
  style: SpeechStyle
): string {
  const titleEn = principle.title.en?.trim() || '';
  const titleVi = principle.title.vi?.trim() || '';
  const bodyEn = principle.body.en?.trim() || '';
  const bodyVi = principle.body.vi?.trim() || '';
  const note = principle.personal_notes?.trim() || '';

  if (languageMode === 'en') {
    const base =
      style === 'lecture'
        ? `Principle ${principle.number}: ${titleEn}. Key takeaway for the exam: ${bodyEn}`
        : `Principle ${principle.number}. ${titleEn}. ${bodyEn}`;
    return note ? `${base} Personal note: ${note}` : base;
  }

  const parts: string[] = [];
  if (style === 'lecture') {
    parts.push(`Nguyên tắc số ${principle.number}: ${titleEn}.`);
    if (titleVi && titleVi !== titleEn) parts.push(`Nghĩa là ${titleVi}.`);
    parts.push(bodyVi || bodyEn);
  } else {
    parts.push(`Nguyên tắc số ${principle.number}: ${titleVi || titleEn}. ${bodyVi || bodyEn}`);
  }

  if (languageMode === 'bilingual' && bodyEn && bodyEn !== bodyVi) {
    parts.push(`Bản tiếng Anh: ${bodyEn}`);
  }
  if (note) parts.push(`Ghi chú cá nhân: ${note}`);

  return normalizeTextForSpeech(parts.join(' '));
}

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  if (name.includes('natural')) score += 60;
  if (name.includes('online')) score += 50;
  if (name.includes('enhanced') || name.includes('premium')) score += 45;
  if (name.includes('siri')) score += 40;
  if (name.includes('google')) score += 35;
  if (name.includes('hoaimy') || name.includes('namminh') || name.includes('linh')) score += 30;
  if (name.includes('ava') || name.includes('aria') || name.includes('jenny') || name.includes('samantha')) score += 25;
  if (!v.localService) score += 10;
  return score;
}

export function getSortedVoicesForLang(
  voices: SpeechSynthesisVoice[],
  lang: 'en-US' | 'vi-VN'
): SpeechSynthesisVoice[] {
  const prefix = lang === 'vi-VN' ? 'vi' : 'en';
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith(prefix))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

export function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  lang: 'en-US' | 'vi-VN',
  preferredVoiceName?: string
): SpeechSynthesisVoice | null {
  const matching = getSortedVoicesForLang(voices, lang);
  if (!matching.length) return null;
  if (preferredVoiceName) {
    const exact = matching.find((v) => v.name === preferredVoiceName);
    if (exact) return exact;
  }
  return matching[0];
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface SpeechPreferences {
  viVoiceName: string;
  enVoiceName: string;
  openaiApiKey: string;
  openaiVoice: 'alloy' | 'nova' | 'shimmer' | 'echo' | 'onyx';
}

const SPEECH_PREFS_KEY = 'certstudio:speech_prefs:v1';

export function loadSpeechPrefs(): SpeechPreferences {
  try {
    const raw = localStorage.getItem(SPEECH_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SpeechPreferences>;
      return {
        viVoiceName: parsed.viVoiceName || '',
        enVoiceName: parsed.enVoiceName || '',
        openaiApiKey: parsed.openaiApiKey || '',
        openaiVoice: parsed.openaiVoice || 'nova',
      };
    }
  } catch {
    // ignore
  }
  return { viVoiceName: '', enVoiceName: '', openaiApiKey: '', openaiVoice: 'nova' };
}

export function saveSpeechPrefs(prefs: SpeechPreferences): void {
  try {
    localStorage.setItem(SPEECH_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export async function fetchOpenAITtsAudio(
  text: string,
  apiKey: string,
  voice: SpeechPreferences['openaiVoice'] = 'nova',
  speed = 1.0
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      input: text,
      voice,
      speed: Math.min(4.0, Math.max(0.25, speed)),
      instructions:
        'Speak naturally like an experienced, friendly Vietnamese tech instructor. Pronounce embedded English technical terms accurately with natural American English accent.',
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI TTS error (${res.status}): ${errText.slice(0, 120)}`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
