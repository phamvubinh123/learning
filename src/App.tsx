import { useCallback, useEffect, useState } from 'react';
import { CertWorkspace } from './components/CertWorkspace';
import { DataToolsModal } from './components/DataToolsModal';
import { Header } from './components/Header';
import { HomeCatalog } from './components/HomeCatalog';
import { AppProvider } from './context/AppContext';
import type { CertBundle, CertTab } from './types/cert';

const VALID_TABS: CertTab[] = ['overview', 'knowledge', 'cheatsheet', 'exam', 'weakspots'];

function parseHash(): { slug: string | null; tab: CertTab } {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  if (!raw) return { slug: null, tab: 'overview' };
  const [slugPart, tabPart] = raw.split('/');
  const tab = VALID_TABS.includes(tabPart as CertTab) ? (tabPart as CertTab) : 'overview';
  return { slug: slugPart || null, tab };
}

function AppShell() {
  const [route, setRoute] = useState<{ slug: string | null; tab: CertTab }>(() => parseHash());
  const [dataToolsOpen, setDataToolsOpen] = useState(false);
  const [activeBundle, setActiveBundle] = useState<CertBundle | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((slug: string | null, tab: CertTab = 'overview') => {
    if (!slug) {
      window.location.hash = '';
      setRoute({ slug: null, tab: 'overview' });
      setActiveBundle(null);
      document.title = 'CertStudio';
    } else {
      window.location.hash = `#/${slug}/${tab}`;
      setRoute({ slug, tab });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleChangeTab = useCallback(
    (tab: CertTab) => {
      if (!route.slug) return;
      window.location.hash = `#/${route.slug}/${tab}`;
      setRoute({ slug: route.slug, tab });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [route.slug]
  );

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      <Header
        activeSlug={route.slug}
        onSelectCert={(slug) => navigate(slug, 'overview')}
        onOpenDataTools={() => setDataToolsOpen(true)}
      />

      {route.slug ? (
        <CertWorkspace
          slug={route.slug}
          activeTab={route.tab}
          onChangeTab={handleChangeTab}
          onBundleLoaded={setActiveBundle}
        />
      ) : (
        <HomeCatalog onSelectCert={(slug) => navigate(slug, 'overview')} />
      )}

      <DataToolsModal
        open={dataToolsOpen}
        onClose={() => setDataToolsOpen(false)}
        activeBundle={activeBundle}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
