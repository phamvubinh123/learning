import type {
  CatalogData,
  CertBundle,
  CertMeta,
  CheatsheetData,
  KnowledgeData,
  QuestionsData,
} from '../types/cert';

const baseUrl = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export function assetUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return '';
  if (/^https?:\/\//.test(relativePath)) return relativePath;
  return `${baseUrl}${relativePath.replace(/^\/+/, '')}`;
}

let catalogCache: CatalogData | null = null;
const certBundleCache = new Map<string, CertBundle>();

async function fetchJson<T>(path: string): Promise<T> {
  const url = assetUrl(path);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không thể tải dữ liệu (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

export async function loadCatalog(): Promise<CatalogData> {
  if (catalogCache) return catalogCache;
  catalogCache = await fetchJson<CatalogData>('data/catalog.json');
  return catalogCache;
}

export async function loadCertBundle(slug: string): Promise<CertBundle> {
  const cached = certBundleCache.get(slug);
  if (cached) return cached;

  const [meta, knowledge, cheatsheet, questions] = await Promise.all([
    fetchJson<CertMeta>(`data/${slug}/meta.json`),
    fetchJson<KnowledgeData>(`data/${slug}/knowledge.json`),
    fetchJson<CheatsheetData>(`data/${slug}/cheatsheet.json`),
    fetchJson<QuestionsData>(`data/${slug}/questions.json`),
  ]);

  const bundle: CertBundle = { meta, knowledge, cheatsheet, questions };
  certBundleCache.set(slug, bundle);
  return bundle;
}
