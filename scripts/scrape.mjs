#!/usr/bin/env node
/**
 * CertPrep Data Scraper (Node.js + Playwright)
 *
 * Usage:
 *   node scripts/scrape.mjs                        # scrapes default certs
 *   node scripts/scrape.mjs ccar-f ccar-p          # scrapes specific slugs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const BADGES_DIR = path.join(PUBLIC_DIR, 'badges');
const BASE_URL = 'https://certprep.practica.asia';

const DEFAULT_SLUGS = ['ccar-f', 'ccar-p', 'cpmai', 'pmp'];

const CERT_META_FALLBACK = {
  'ccar-f': { provider: 'Anthropic', category: 'AI & Architecture', accent: '#0ea5e9' },
  'ccar-p': { provider: 'Anthropic', category: 'AI & Architecture', accent: '#0284c7' },
  cpmai: { provider: 'PMI', category: 'AI Project Management', accent: '#10b981' },
  pmp: { provider: 'PMI', category: 'Project Management', accent: '#f59e0b' },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadAsset(remotePath, localFile) {
  if (!remotePath) return null;
  const url = remotePath.startsWith('http') ? remotePath : `${BASE_URL}${remotePath}`;
  await ensureDir(path.dirname(localFile));
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(localFile, buf);
    return path.relative(PUBLIC_DIR, localFile).replace(/\\/g, '/');
  } catch {
    return null;
  }
}

function parseNumber(text) {
  const m = (text || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function parseExamConfig(factsEn) {
  const findFact = (keywords) =>
    factsEn.find((f) => keywords.some((k) => f.label.toLowerCase().includes(k)));

  const qFact = findFact(['question']);
  const dFact = findFact(['duration', 'time', 'length']);
  const pFact = findFact(['pass', 'score']);
  const fFact = findFact(['fee', 'cost', 'price']);
  const vFact = findFact(['valid', 'renew']);
  const delFact = findFact(['deliver', 'format', 'proctor']);

  let durationMinutes = parseNumber(dFact?.value);
  if (dFact?.value && /hour|hr/i.test(dFact.value) && durationMinutes && durationMinutes < 10) {
    durationMinutes = Math.round(durationMinutes * 60);
  }

  return {
    totalQuestions: parseNumber(qFact?.value) || 60,
    durationMinutes: durationMinutes || 120,
    passingScore: pFact?.value || '',
    passingDetail: pFact?.detail || '',
    fee: fFact?.value || '',
    validity: vFact?.value || '',
    delivery: delFact?.value || '',
  };
}

async function extractOverview(page, slug, locale) {
  const url = `${BASE_URL}/${locale}/${slug}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('main', { timeout: 15000 });

  return await page.evaluate(() => {
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const badgeImg = document.querySelector('.cert-band img.badge');
    const badgeSrc = badgeImg ? badgeImg.getAttribute('src') : null;
    const bandTitle = clean(document.querySelector('.cert-band h1, .cert-band .title, main h1')?.textContent);
    const heroH1 = clean(document.querySelector('main h1')?.textContent) || bandTitle;
    const heroSubtitle = clean(
      document.querySelector('main .hero p, main .cert-hero p, main section:first-of-type p:not(.alt-en)')?.textContent
    );

    const examFacts = [...document.querySelectorAll('.exam-facts > div')].map((div) => {
      const label = clean(div.querySelector('.lbl')?.textContent);
      const value = clean(div.querySelector('b')?.textContent);
      const clone = div.cloneNode(true);
      clone.querySelector('.lbl')?.remove();
      clone.querySelector('b')?.remove();
      const detail = clean(clone.textContent);
      return { label, value, detail };
    });

    const factsSourceEl = document.querySelector('.facts-src a');
    const factsSource = factsSourceEl
      ? { label: clean(factsSourceEl.textContent), url: factsSourceEl.getAttribute('href') }
      : null;

    const domains = [...document.querySelectorAll('.domain-cards .domain-card')].map((card, idx) => {
      const weightText = clean(card.querySelector('.w')?.textContent);
      const weightMatch = weightText.match(/(\d+)/);
      const code = clean(card.querySelector('.id')?.textContent) || `DOMAIN ${idx + 1}`;
      const name = clean(card.querySelector('h4')?.textContent);
      const metaText = clean(card.querySelector('.meta span:first-child')?.textContent);
      const href = card.getAttribute('href') || '';
      const idMatch = href.match(/#(d\d+)/i);
      const id = idMatch ? idMatch[1].toUpperCase() : `D${idx + 1}`;
      const nums = metaText.match(/\d+/g) || [];
      return {
        id,
        code,
        weight: weightMatch ? Number(weightMatch[1]) : 0,
        name,
        principleCount: nums[0] ? Number(nums[0]) : 0,
        questionCount: nums[1] ? Number(nums[1]) : 0,
      };
    });

    const studyPlan = [...document.querySelectorAll('.plan .phase')].map((ph, idx) => {
      const phaseLabel = clean(ph.querySelector('.ph span')?.textContent) || `Phase ${idx + 1}`;
      const title = clean(ph.querySelector('h4')?.textContent);
      const steps = [...ph.querySelectorAll('ul li')].map((li) => {
        const viEl = li.querySelector('[lang="vi"]');
        const enEl = li.querySelector('[lang="en"]');
        const fallback = clean(li.textContent);
        return {
          text: viEl ? clean(viEl.textContent) : fallback,
          altEn: enEl ? clean(enEl.textContent) : null,
        };
      });
      return { phase: phaseLabel, title, steps };
    });

    const guideEl = document.querySelector('.cert-guide');
    let guide = null;
    if (guideEl) {
      const title = clean(guideEl.querySelector('.block-head h3')?.textContent);
      const intro = clean(guideEl.querySelector('.block-head p:not(.alt-en)')?.textContent);
      guide = { title, intro };
    }

    const faqs = [...document.querySelectorAll('.faq .faq-item')].map((item) => ({
      question: clean(item.querySelector('summary')?.textContent),
      answer: clean(item.querySelector('p')?.textContent),
    }));

    return {
      badgeSrc,
      title: bandTitle || heroH1,
      subtitle: heroSubtitle,
      examFacts,
      factsSource,
      domains,
      studyPlan,
      guide,
      faqs,
    };
  });
}

async function extractKnowledge(page, slug, locale) {
  const url = `${BASE_URL}/${locale}/${slug}/knowledge`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('section.domain-sec', { timeout: 15000 });

  return await page.evaluate(() => {
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('section.domain-sec')].map((sec, dIdx) => {
      const id = (sec.getAttribute('id') || `d${dIdx + 1}`).toUpperCase();
      const bigText = clean(sec.querySelector('.domain-head .big')?.textContent);
      const weightMatch = bigText.match(/(\d+)/);
      const name = clean(sec.querySelector('.domain-head h3')?.textContent);
      const viDesc = clean(sec.querySelector('.domain-head p[lang="vi"]')?.textContent);
      const enDesc = clean(
        sec.querySelector('.domain-head p[lang="en"], .domain-head p.alt-en')?.textContent
      );
      const plainDesc = clean(sec.querySelector('.domain-head p')?.textContent);

      const principles = [...sec.querySelectorAll('article.principle')].map((art, pIdx) => {
        const pid = art.getAttribute('id') || art.getAttribute('data-p') || `${id.toLowerCase()}-p${pIdx + 1}`;
        const num = Number(clean(art.querySelector('.num')?.textContent)) || pIdx + 1;
        const title = clean(art.querySelector('h4')?.textContent);
        const bodyViEl = art.querySelector(':scope > div > .body[lang="vi"], .body[lang="vi"]');
        const bodyEnEl = art.querySelector('.alt-en .body, .body[lang="en"]');
        const bodyFallback = art.querySelector('.body');
        const practiceText = clean(art.querySelector('.practice-link')?.textContent);
        const qMatch = practiceText.match(/(\d+)/);

        return {
          id: pid,
          number: num,
          domainId: id,
          title,
          bodyVi: clean(bodyViEl?.textContent),
          bodyEn: clean(bodyEnEl?.textContent),
          bodyPlain: clean(bodyFallback?.textContent),
          questionCount: qMatch ? Number(qMatch[1]) : 0,
        };
      });

      return {
        id,
        weight: weightMatch ? Number(weightMatch[1]) : 0,
        name,
        descVi: viDesc || plainDesc,
        descEn: enDesc || plainDesc,
        principles,
      };
    });
  });
}

async function extractCheatsheet(page, slug, locale) {
  const url = `${BASE_URL}/${locale}/${slug}/cheatsheet`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('main', { timeout: 15000 });

  return await page.evaluate(() => {
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const rules = [...document.querySelectorAll('.rule-row')].map((row, idx) => {
      const index = clean(row.querySelector('.i')?.textContent) || String(idx + 1).padStart(2, '0');
      const situation = clean(row.querySelector('.sit')?.textContent);
      const choice = clean(row.querySelector('.ch')?.textContent);
      const altEn = clean(row.querySelector('.alt-en')?.textContent);
      return { index, situation, choice, altEn };
    });

    const vocabulary = [...document.querySelectorAll('.vocab > div')].map((div, idx) => ({
      id: `v-${idx + 1}`,
      term: clean(div.querySelector('b')?.textContent),
      meaning: clean(div.querySelector('span')?.textContent),
    }));

    const glossary = [];
    let currentLetter = '#';
    const glossEl = document.querySelector('.gloss');
    if (glossEl) {
      for (const child of glossEl.children) {
        if (child.classList.contains('letter')) {
          currentLetter = clean(child.textContent) || '#';
        } else if (child.hasAttribute('data-g') || child.querySelector('b')) {
          const term = clean(child.querySelector('b')?.textContent);
          let def = clean(child.querySelector('span')?.textContent);
          def = def.replace(/^[—–-]\s*/, '').trim();
          if (term) {
            glossary.push({
              id: `g-${glossary.length + 1}`,
              letter: currentLetter,
              term,
              definition: def,
            });
          }
        }
      }
    }

    return { rules, vocabulary, glossary };
  });
}

async function extractQuestions(page, slug) {
  const url = `${BASE_URL}/vi/${slug}/exam`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(800);

  const html = await page.content();
  const pushes = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)]
    .map((m) => {
      try {
        return JSON.parse(`"${m[1]}"`);
      } catch {
        return '';
      }
    })
    .join('');

  const certIdMatch = pushes.match(/"certId":"([^"]+)"/);
  if (!certIdMatch) throw new Error(`Could not find certId on ${url}`);
  const certId = certIdMatch[1];

  const uidSet = new Set();
  for (const m of pushes.matchAll(/"uid":"([^"]+)"/g)) {
    uidSet.add(m[1]);
  }
  const uids = [...uidSet];
  console.log(`  Found certId=${certId}, total UIDs=${uids.length}`);

  const allQuestions = [];
  const casesMap = new Map();
  const BATCH_SIZE = 200;

  for (let i = 0; i < uids.length; i += BATCH_SIZE) {
    const batch = uids.slice(i, i + BATCH_SIZE);
    let attempt = 0;
    let payload = null;
    let rateLimited = false;

    while (attempt < 3) {
      attempt++;
      const res = await page.evaluate(
        async ({ certId, batch }) => {
          const r = await fetch(`/api/questions/${certId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uids: batch }),
          });
          const retryAfter = r.headers.get('retry-after');
          const body = await r.json().catch(() => ({}));
          return { status: r.status, retryAfter, body };
        },
        { certId, batch }
      );

      if (res.status === 200 && Array.isArray(res.body.questions)) {
        payload = res.body;
        break;
      }

      if (res.status === 429) {
        rateLimited = true;
        const retrySec = Number(res.retryAfter);
        const waitMs = Number.isFinite(retrySec) && retrySec > 0 ? retrySec * 1000 + 1000 : 6000;
        console.warn(`  [429 ${attempt}/3] /api/questions/${certId} waiting ${Math.round(waitMs / 1000)}s`);
        if (attempt < 3) await sleep(waitMs);
      } else {
        if (attempt < 3) await sleep(2000 * attempt);
      }
    }

    if (!payload) {
      console.warn(
        `  [notice] Stopping question fetch for ${slug} at ${allQuestions.length}/${uids.length}` +
          (rateLimited ? ' (HTTP 429 rate limit)' : '')
      );
      break;
    }

    allQuestions.push(...payload.questions);
    for (const c of payload.cases || []) {
      casesMap.set(c.id, c);
    }
    console.log(`  Fetched ${allQuestions.length}/${uids.length} questions (${casesMap.size} cases)`);
    if (i + BATCH_SIZE < uids.length) {
      await sleep(1800);
    }
  }

  for (const q of allQuestions) {
    if (q.image?.src && q.image.src.startsWith('/')) {
      const localPath = path.join(PUBLIC_DIR, q.image.src.replace(/^\/+/, ''));
      const rel = await downloadAsset(q.image.src, localPath);
      if (rel) q.image.localSrc = rel;
    }
  }

  const normalizedQuestions = allQuestions.map((q) => {
    const base = {
      uid: q.uid,
      type: q.type || 'single',
      set: q.set || null,
      domain: (q.domain || '').toUpperCase(),
      principles: Array.isArray(q.principles) ? q.principles : [],
      caseId: q.case || q.caseId || null,
      provenance: q.provenance || null,
      question: {
        en: cleanText(q.question),
        vi: cleanText(q.vi?.question || q.question),
      },
      explanation: {
        en: cleanText(q.explanation),
        vi: cleanText(q.vi?.explanation || q.explanation),
      },
      correct: q.correct ?? null,
      select: q.select ?? null,
      personal_notes: '',
    };

    if (q.options && typeof q.options === 'object') {
      base.options = Object.keys(q.options).map((key) => ({
        key,
        en: cleanText(q.options[key]),
        vi: cleanText(q.vi?.options?.[key] || q.options[key]),
      }));
    }

    if (q.type === 'dropdown' && Array.isArray(q.blanks)) {
      base.layout = q.layout || null;
      base.blanks = q.blanks.map((b, bIdx) => ({
        id: `b-${bIdx + 1}`,
        label: {
          en: cleanText(b.label),
          vi: cleanText(b.label_vi || b.label),
        },
        options: (b.options || []).map((optEn, oIdx) => ({
          index: oIdx,
          en: cleanText(optEn),
          vi: cleanText(b.options_vi?.[oIdx] || optEn),
        })),
        correct: b.correct,
      }));
    }

    if (q.type === 'hotspot') {
      base.image = q.image
        ? {
            src: q.image.localSrc || q.image.src,
            w: q.image.w,
            h: q.image.h,
            alt: {
              en: cleanText(q.image.alt),
              vi: cleanText(q.image.alt_vi || q.image.alt),
            },
          }
        : null;
      base.regions = (q.regions || []).map((r) => ({
        id: r.id,
        shape: r.shape || 'rect',
        coords: r.coords,
        label: {
          en: cleanText(r.label),
          vi: cleanText(r.label_vi || r.label),
        },
      }));
    }

    return base;
  });

  const normalizedCases = [...casesMap.values()].map((c) => ({
    id: c.id,
    title: {
      en: cleanText(c.title || c.name),
      vi: cleanText(c.vi?.title || c.title_vi || c.title || c.name),
    },
    body: {
      en: cleanText(c.body || c.text || c.description),
      vi: cleanText(c.vi?.body || c.vi?.text || c.body_vi || c.body || c.text || c.description),
    },
  }));

  return { certId, questions: normalizedQuestions, cases: normalizedCases };
}

function mergeBilingualCheatsheet(viCs, enCs) {
  const rules = viCs.rules.map((r, i) => {
    const enR = enCs.rules[i];
    let enSit = enR?.situation || '';
    let enChoice = enR?.choice || '';
    if ((!enSit || !enChoice) && r.altEn) {
      const parts = r.altEn.split('→').map((s) => cleanText(s));
      enSit = enSit || parts[0] || '';
      enChoice = enChoice || parts[1] || '';
    }
    return {
      id: `rule-${r.index || i + 1}`,
      index: r.index || String(i + 1).padStart(2, '0'),
      situation: { en: enSit || r.situation, vi: r.situation },
      choice: { en: enChoice || r.choice, vi: r.choice },
      personal_notes: '',
    };
  });

  const vocabulary = viCs.vocabulary.map((v, i) => ({
    id: v.id,
    term: v.term,
    meaning: { en: enCs.vocabulary[i]?.meaning || v.meaning, vi: v.meaning },
  }));

  const glossary = viCs.glossary.map((g, i) => ({
    id: g.id,
    letter: g.letter,
    term: g.term,
    definition: { en: enCs.glossary[i]?.definition || g.definition, vi: g.definition },
  }));

  return { rules, vocabulary, glossary };
}

async function scrapeCert(browser, slug) {
  console.log(`\n=== Scraping ${slug} ===`);
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    const ovVi = await extractOverview(page, slug, 'vi');
    const ovEn = await extractOverview(page, slug, 'en');

    let localBadge = null;
    if (ovVi.badgeSrc) {
      const ext = path.extname(ovVi.badgeSrc) || '.png';
      localBadge = await downloadAsset(ovVi.badgeSrc, path.join(BADGES_DIR, `${slug}${ext}`));
    }

    const knVi = await extractKnowledge(page, slug, 'vi');
    const knEn = await extractKnowledge(page, slug, 'en');

    const domainsKnowledge = knVi.map((dVi, dIdx) => {
      const dEn = knEn.find((d) => d.id === dVi.id) || knEn[dIdx];
      const principles = dVi.principles.map((pVi, pIdx) => {
        const pEn = dEn?.principles?.find((p) => p.id === pVi.id) || dEn?.principles?.[pIdx];
        return {
          id: pVi.id,
          number: pVi.number,
          domainId: dVi.id,
          title: { en: pEn?.title || pVi.title, vi: pVi.title },
          body: { en: pVi.bodyEn || pEn?.bodyPlain || pVi.bodyVi, vi: pVi.bodyVi || pVi.bodyPlain },
          questionCount: pVi.questionCount || pEn?.questionCount || 0,
          personal_notes: '',
        };
      });

      return {
        id: dVi.id,
        code: `Domain ${dIdx + 1}`,
        weight: dVi.weight,
        name: { en: dEn?.name || dVi.name, vi: dVi.name },
        description: { en: dVi.descEn || dEn?.descEn || '', vi: dVi.descVi || '' },
        principles,
      };
    });

    const csVi = await extractCheatsheet(page, slug, 'vi');
    const csEn = await extractCheatsheet(page, slug, 'en');
    const cheatsheetMerged = mergeBilingualCheatsheet(csVi, csEn);

    const qData = await extractQuestions(page, slug);

    const qCountByDomain = {};
    for (const q of qData.questions) {
      qCountByDomain[q.domain] = (qCountByDomain[q.domain] || 0) + 1;
    }

    const fallbackMeta = CERT_META_FALLBACK[slug] || {
      provider: 'Certification',
      category: 'Professional',
      accent: '#0ea5e9',
    };

    const scrapedAt = new Date().toISOString();
    const examFacts = ovVi.examFacts.map((fVi, idx) => ({
      label: { en: ovEn.examFacts[idx]?.label || fVi.label, vi: fVi.label },
      value: { en: ovEn.examFacts[idx]?.value || fVi.value, vi: fVi.value },
      detail: { en: ovEn.examFacts[idx]?.detail || fVi.detail, vi: fVi.detail },
    }));

    const examConfig = parseExamConfig(ovEn.examFacts);

    const studyPlan = ovVi.studyPlan.map((pVi, idx) => ({
      phase: pVi.phase,
      title: { en: ovEn.studyPlan[idx]?.title || pVi.title, vi: pVi.title },
      steps: pVi.steps.map((s, sIdx) => ({
        en: s.altEn || ovEn.studyPlan[idx]?.steps?.[sIdx]?.text || s.text,
        vi: s.text,
      })),
    }));

    const faqs = ovVi.faqs.map((fVi, idx) => ({
      question: { en: ovEn.faqs[idx]?.question || fVi.question, vi: fVi.question },
      answer: { en: ovEn.faqs[idx]?.answer || fVi.answer, vi: fVi.answer },
    }));

    const domainsMeta = domainsKnowledge.map((d, idx) => ({
      id: d.id,
      code: d.code,
      weight: d.weight || ovVi.domains[idx]?.weight || 0,
      name: d.name,
      description: d.description,
      principleCount: d.principles.length,
      questionCount: qCountByDomain[d.id] || ovVi.domains[idx]?.questionCount || 0,
    }));

    const metaJson = {
      slug,
      certId: qData.certId,
      code: slug.toUpperCase(),
      name: { en: ovEn.title || ovVi.title, vi: ovVi.title || ovEn.title },
      tagline: { en: ovEn.subtitle || ovVi.subtitle, vi: ovVi.subtitle || ovEn.subtitle },
      provider: fallbackMeta.provider,
      category: fallbackMeta.category,
      accent: fallbackMeta.accent,
      badge: localBadge,
      examConfig,
      examFacts,
      factsSource: ovVi.factsSource || ovEn.factsSource,
      domains: domainsMeta,
      studyPlan,
      guide: {
        title: { en: ovEn.guide?.title || '', vi: ovVi.guide?.title || '' },
        intro: { en: ovEn.guide?.intro || '', vi: ovVi.guide?.intro || '' },
      },
      faqs,
      stats: {
        domains: domainsMeta.length,
        principles: domainsKnowledge.reduce((acc, d) => acc + d.principles.length, 0),
        rules: cheatsheetMerged.rules.length,
        glossary: cheatsheetMerged.glossary.length,
        questions: qData.questions.length,
      },
      sourceUrl: `${BASE_URL}/vi/${slug}`,
      scrapedAt,
    };

    const certDir = path.join(DATA_DIR, slug);
    await ensureDir(certDir);

    let finalQuestionsJson = {
      slug,
      certId: qData.certId,
      scrapedAt,
      totalCount: qData.questions.length,
      cases: qData.cases,
      questions: qData.questions,
    };

    if (qData.questions.length === 0) {
      try {
        const existingParsed = JSON.parse(await fs.readFile(path.join(certDir, 'questions.json'), 'utf8'));
        if (Array.isArray(existingParsed.questions) && existingParsed.questions.length > 0) {
          finalQuestionsJson = existingParsed;
          metaJson.stats.questions = existingParsed.questions.length;
        }
      } catch {
        // ignore
      }
    }

    await Promise.all([
      fs.writeFile(path.join(certDir, 'meta.json'), JSON.stringify(metaJson, null, 2), 'utf8'),
      fs.writeFile(
        path.join(certDir, 'knowledge.json'),
        JSON.stringify({ slug, certId: qData.certId, scrapedAt, domains: domainsKnowledge }, null, 2),
        'utf8'
      ),
      fs.writeFile(
        path.join(certDir, 'cheatsheet.json'),
        JSON.stringify({ slug, certId: qData.certId, scrapedAt, ...cheatsheetMerged }, null, 2),
        'utf8'
      ),
      fs.writeFile(path.join(certDir, 'questions.json'), JSON.stringify(finalQuestionsJson, null, 2), 'utf8'),
    ]);

    console.log(
      `✓ Saved ${slug}: ${metaJson.stats.domains} domains, ${metaJson.stats.principles} principles, ` +
        `${metaJson.stats.rules} rules, ${metaJson.stats.glossary} glossary, ${metaJson.stats.questions} questions`
    );
  } finally {
    await context.close();
  }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const slugs = args.length ? args : DEFAULT_SLUGS;

  const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
  try {
    await fs.access(executablePath);
    launchOpts.executablePath = executablePath;
  } catch {
    // fallback
  }

  const browser = await chromium.launch(launchOpts);
  try {
    await ensureDir(DATA_DIR);
    const catalogPath = path.join(DATA_DIR, 'catalog.json');

    async function rebuildCatalog() {
      const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
      const catalogMap = new Map();
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          const m = JSON.parse(await fs.readFile(path.join(DATA_DIR, entry.name, 'meta.json'), 'utf8'));
          catalogMap.set(m.slug, {
            slug: m.slug,
            certId: m.certId,
            code: m.code,
            name: m.name,
            tagline: m.tagline,
            provider: m.provider,
            category: m.category,
            accent: m.accent,
            badge: m.badge,
            examConfig: m.examConfig,
            stats: m.stats,
            scrapedAt: m.scrapedAt,
          });
        } catch {
          // ignore
        }
      }

      const ordered = [];
      for (const slug of DEFAULT_SLUGS) {
        if (catalogMap.has(slug)) {
          ordered.push(catalogMap.get(slug));
          catalogMap.delete(slug);
        }
      }
      for (const rest of catalogMap.values()) ordered.push(rest);

      await fs.writeFile(
        catalogPath,
        JSON.stringify({ generatedAt: new Date().toISOString(), certifications: ordered }, null, 2),
        'utf8'
      );
    }

    for (const slug of slugs) {
      await scrapeCert(browser, slug);
      await rebuildCatalog();
      if (slug !== slugs[slugs.length - 1]) await sleep(2000);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
