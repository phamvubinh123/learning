import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loadCatalog } from '../services/dataLoader';
import {
  createEmptyOverrides,
  createEmptyProgress,
  downloadJsonFile,
  loadAllOverrides,
  loadAllProgress,
  loadLanguageMode,
  loadTheme,
  mergeBackupData,
  saveAllOverrides,
  saveAllProgress,
  saveLanguageMode,
  saveTheme,
} from '../services/storage';
import type {
  CertCatalogItem,
  CertOverrides,
  CertProgress,
  ExamHistoryEntry,
  LanguageMode,
  PrincipleOverride,
  QuestionOverride,
  RuleOverride,
  ThemeMode,
  UserBackupPayload,
} from '../types/cert';

interface AppContextValue {
  catalog: CertCatalogItem[];
  catalogLoading: boolean;
  catalogError: string | null;
  theme: ThemeMode;
  toggleTheme: () => void;
  languageMode: LanguageMode;
  setLanguageMode: (mode: LanguageMode) => void;
  progressByCert: Record<string, CertProgress>;
  overridesByCert: Record<string, CertOverrides>;
  getProgress: (slug: string) => CertProgress;
  getOverrides: (slug: string) => CertOverrides;
  toggleReadPrinciple: (slug: string, principleId: string) => void;
  toggleBookmarkRule: (slug: string, ruleId: string) => void;
  recordQuestionResult: (slug: string, uid: string, isCorrect: boolean) => void;
  recordBatchResults: (slug: string, results: { uid: string; isCorrect: boolean }[]) => void;
  setWeakSpotResolved: (slug: string, uid: string, resolved: boolean) => void;
  addExamHistory: (slug: string, entry: ExamHistoryEntry) => void;
  savePrincipleOverride: (slug: string, principleId: string, override: Omit<PrincipleOverride, 'updatedAt'>) => void;
  resetPrincipleOverride: (slug: string, principleId: string) => void;
  saveRuleOverride: (slug: string, ruleId: string, override: Omit<RuleOverride, 'updatedAt'>) => void;
  resetRuleOverride: (slug: string, ruleId: string) => void;
  saveQuestionOverride: (slug: string, uid: string, override: Omit<QuestionOverride, 'updatedAt'>) => void;
  resetQuestionOverride: (slug: string, uid: string) => void;
  exportFullBackup: () => void;
  restoreBackup: (payload: UserBackupPayload, mode: 'merge' | 'replace') => void;
  resetCertProgress: (slug: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<CertCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [languageMode, setLanguageModeState] = useState<LanguageMode>(() => loadLanguageMode());
  const [progressByCert, setProgressByCert] = useState<Record<string, CertProgress>>(() =>
    loadAllProgress()
  );
  const [overridesByCert, setOverridesByCert] = useState<Record<string, CertOverrides>>(() =>
    loadAllOverrides()
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    loadCatalog()
      .then((data) => {
        if (!active) return;
        setCatalog(data.certifications || []);
        setCatalogLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setCatalogError(err instanceof Error ? err.message : 'Failed to load catalog');
        setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setLanguageMode = useCallback((mode: LanguageMode) => {
    setLanguageModeState(mode);
    saveLanguageMode(mode);
  }, []);

  const getProgress = useCallback(
    (slug: string): CertProgress => progressByCert[slug] || createEmptyProgress(),
    [progressByCert]
  );

  const getOverrides = useCallback(
    (slug: string): CertOverrides => overridesByCert[slug] || createEmptyOverrides(),
    [overridesByCert]
  );

  const updateProgress = useCallback(
    (slug: string, updater: (prev: CertProgress) => CertProgress) => {
      setProgressByCert((all) => {
        const current = all[slug] || createEmptyProgress();
        const next = { ...all, [slug]: updater(current) };
        saveAllProgress(next);
        return next;
      });
    },
    []
  );

  const updateOverrides = useCallback(
    (slug: string, updater: (prev: CertOverrides) => CertOverrides) => {
      setOverridesByCert((all) => {
        const current = all[slug] || createEmptyOverrides();
        const next = { ...all, [slug]: updater(current) };
        saveAllOverrides(next);
        return next;
      });
    },
    []
  );

  const toggleReadPrinciple = useCallback(
    (slug: string, principleId: string) => {
      updateProgress(slug, (prev) => ({
        ...prev,
        readPrinciples: {
          ...prev.readPrinciples,
          [principleId]: !prev.readPrinciples[principleId],
        },
      }));
    },
    [updateProgress]
  );

  const toggleBookmarkRule = useCallback(
    (slug: string, ruleId: string) => {
      updateProgress(slug, (prev) => ({
        ...prev,
        bookmarkedRules: {
          ...prev.bookmarkedRules,
          [ruleId]: !prev.bookmarkedRules[ruleId],
        },
      }));
    },
    [updateProgress]
  );

  const recordBatchResults = useCallback(
    (slug: string, results: { uid: string; isCorrect: boolean }[]) => {
      if (!results.length) return;
      const now = new Date().toISOString();
      updateProgress(slug, (prev) => {
        const nextStats = { ...prev.questionStats };
        for (const { uid, isCorrect } of results) {
          const old = nextStats[uid] || {
            attempts: 0,
            correctCount: 0,
            wrongCount: 0,
            lastCorrect: false,
            lastAnsweredAt: now,
          };
          nextStats[uid] = {
            attempts: old.attempts + 1,
            correctCount: old.correctCount + (isCorrect ? 1 : 0),
            wrongCount: old.wrongCount + (isCorrect ? 0 : 1),
            lastCorrect: isCorrect,
            lastAnsweredAt: now,
            resolvedWeakSpot: isCorrect ? old.resolvedWeakSpot : false,
          };
        }
        return { ...prev, questionStats: nextStats };
      });
    },
    [updateProgress]
  );

  const recordQuestionResult = useCallback(
    (slug: string, uid: string, isCorrect: boolean) => {
      recordBatchResults(slug, [{ uid, isCorrect }]);
    },
    [recordBatchResults]
  );

  const setWeakSpotResolved = useCallback(
    (slug: string, uid: string, resolved: boolean) => {
      updateProgress(slug, (prev) => {
        const old = prev.questionStats[uid];
        if (!old) return prev;
        return {
          ...prev,
          questionStats: {
            ...prev.questionStats,
            [uid]: { ...old, resolvedWeakSpot: resolved },
          },
        };
      });
    },
    [updateProgress]
  );

  const addExamHistory = useCallback(
    (slug: string, entry: ExamHistoryEntry) => {
      updateProgress(slug, (prev) => ({
        ...prev,
        examHistory: [entry, ...prev.examHistory].slice(0, 50),
      }));
    },
    [updateProgress]
  );

  const savePrincipleOverride = useCallback(
    (slug: string, principleId: string, override: Omit<PrincipleOverride, 'updatedAt'>) => {
      updateOverrides(slug, (prev) => ({
        ...prev,
        principles: {
          ...prev.principles,
          [principleId]: { ...override, updatedAt: new Date().toISOString() },
        },
      }));
    },
    [updateOverrides]
  );

  const resetPrincipleOverride = useCallback(
    (slug: string, principleId: string) => {
      updateOverrides(slug, (prev) => {
        const next = { ...prev.principles };
        delete next[principleId];
        return { ...prev, principles: next };
      });
    },
    [updateOverrides]
  );

  const saveRuleOverride = useCallback(
    (slug: string, ruleId: string, override: Omit<RuleOverride, 'updatedAt'>) => {
      updateOverrides(slug, (prev) => ({
        ...prev,
        rules: {
          ...prev.rules,
          [ruleId]: { ...override, updatedAt: new Date().toISOString() },
        },
      }));
    },
    [updateOverrides]
  );

  const resetRuleOverride = useCallback(
    (slug: string, ruleId: string) => {
      updateOverrides(slug, (prev) => {
        const next = { ...prev.rules };
        delete next[ruleId];
        return { ...prev, rules: next };
      });
    },
    [updateOverrides]
  );

  const saveQuestionOverride = useCallback(
    (slug: string, uid: string, override: Omit<QuestionOverride, 'updatedAt'>) => {
      updateOverrides(slug, (prev) => ({
        ...prev,
        questions: {
          ...prev.questions,
          [uid]: { ...override, updatedAt: new Date().toISOString() },
        },
      }));
    },
    [updateOverrides]
  );

  const resetQuestionOverride = useCallback(
    (slug: string, uid: string) => {
      updateOverrides(slug, (prev) => {
        const next = { ...prev.questions };
        delete next[uid];
        return { ...prev, questions: next };
      });
    },
    [updateOverrides]
  );

  const exportFullBackup = useCallback(() => {
    const payload: UserBackupPayload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      languageMode,
      theme,
      progressByCert,
      overridesByCert,
    };
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadJsonFile(`certstudio-backup-${dateStamp}.json`, payload);
  }, [languageMode, theme, progressByCert, overridesByCert]);

  const restoreBackup = useCallback(
    (payload: UserBackupPayload, mode: 'merge' | 'replace') => {
      if (mode === 'replace') {
        setProgressByCert(payload.progressByCert);
        setOverridesByCert(payload.overridesByCert);
        saveAllProgress(payload.progressByCert);
        saveAllOverrides(payload.overridesByCert);
      } else {
        const merged = mergeBackupData(progressByCert, overridesByCert, payload);
        setProgressByCert(merged.progressByCert);
        setOverridesByCert(merged.overridesByCert);
        saveAllProgress(merged.progressByCert);
        saveAllOverrides(merged.overridesByCert);
      }
      if (payload.languageMode) setLanguageMode(payload.languageMode);
      if (payload.theme) setTheme(payload.theme);
    },
    [progressByCert, overridesByCert, setLanguageMode]
  );

  const resetCertProgress = useCallback(
    (slug: string) => {
      updateProgress(slug, () => createEmptyProgress());
    },
    [updateProgress]
  );

  return (
    <AppContext.Provider
      value={{
        catalog,
        catalogLoading,
        catalogError,
        theme,
        toggleTheme,
        languageMode,
        setLanguageMode,
        progressByCert,
        overridesByCert,
        getProgress,
        getOverrides,
        toggleReadPrinciple,
        toggleBookmarkRule,
        recordQuestionResult,
        recordBatchResults,
        setWeakSpotResolved,
        addExamHistory,
        savePrincipleOverride,
        resetPrincipleOverride,
        saveRuleOverride,
        resetRuleOverride,
        saveQuestionOverride,
        resetQuestionOverride,
        exportFullBackup,
        restoreBackup,
        resetCertProgress,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
