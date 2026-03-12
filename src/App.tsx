import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import { usePeriod } from './hooks/usePeriod';
import { Modal360Provider } from './contexts/Modal360Context';
import { LoginForm } from './components/LoginForm';
import { Header } from './components/layout/Header';
import { PageNav } from './components/layout/PageNav';
import { Footer } from './components/layout/Footer';

// Pages
import { Overview } from './pages/Overview';
import { Pipeline } from './pages/Pipeline';
import { KPIDetail } from './pages/KPIDetail';
import { Leaderboard } from './pages/Leaderboard';
import { PortfolioPublished } from './pages/PortfolioPublished';
import { PortfolioQualityPage } from './pages/PortfolioQuality';
import { PricingIntelligence } from './pages/PricingIntelligence';
import { Accountability } from './pages/Accountability';
import { Withdrawals } from './pages/Withdrawals';
import { AgentProfile } from './pages/AgentProfile';
import { Insights } from './pages/Insights';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Funnel } from './pages/Funnel';
import { Properties } from './pages/Properties';
import { CrmVsAcc } from './pages/CrmVsAcc';
import { GciRankings } from './pages/GciRankings';

import { SearchPalette } from './components/search/SearchPalette';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour
      retry: 1,
    },
  },
});

function Dashboard() {
  const { profile, signIn, signOut, loading, isAuthenticated } = useAuth();
  const { period, periodType, year, value, setPeriodType, setYear, setValue } = usePeriod();
  const [activePage, setActivePage] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <LoginForm onLogin={signIn} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <Overview period={period} />;
      case 'pipeline':
        return <Pipeline period={period} />;
      case 'kpis':
        return <KPIDetail period={period} />;
      case 'leaderboard':
        return <Leaderboard period={period} />;
      case 'portfolio-published':
        return <PortfolioPublished period={period} />;
      case 'portfolio-quality':
        return <PortfolioQualityPage period={period} />;
      case 'pricing':
        return <PricingIntelligence period={period} />;
      case 'accountability':
        return <Accountability period={period} />;
      case 'withdrawals':
        return <Withdrawals period={period} />;
      case 'agent-profile':
        return <AgentProfile period={period} />;
      case 'insights':
        return <Insights period={period} />;
      case 'reports':
        return <Reports period={period} />;
      case 'settings':
        return <Settings period={period} />;
      // v1 pages kept for backwards compat
      case 'funnel':
        return <Funnel period={period} />;
      case 'properties':
        return <Properties period={period} />;
      case 'crm-vs-acc':
        return <CrmVsAcc period={period} />;
      case 'gci':
        return <GciRankings period={period} />;
      default:
        return <Overview period={period} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header
        periodType={periodType}
        year={year}
        value={value}
        periodLabel={period.label}
        onPeriodTypeChange={setPeriodType}
        onYearChange={setYear}
        onValueChange={setValue}
        onSignOut={signOut}
        userEmail={profile.email}
      />
      <PageNav
        activePage={activePage}
        onPageChange={setActivePage}
        userRole={profile.role}
      />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Modal360Provider>
        <Dashboard />
        <SearchPalette />
      </Modal360Provider>
    </QueryClientProvider>
  );
}
