import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import { usePeriod } from './hooks/usePeriod';
import { LoginForm } from './components/LoginForm';
import { Header } from './components/layout/Header';
import { PageNav } from './components/layout/PageNav';
import { Footer } from './components/layout/Footer';
import { Overview } from './pages/Overview';
import { KPIDetail } from './pages/KPIDetail';
import { Withdrawals } from './pages/Withdrawals';
import { Funnel } from './pages/Funnel';
import { Properties } from './pages/Properties';
import { CrmVsAcc } from './pages/CrmVsAcc';
import { GciRankings } from './pages/GciRankings';

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
      case 'kpis':
        return <KPIDetail period={period} />;
      case 'withdrawals':
        return <Withdrawals period={period} />;
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
      <PageNav activePage={activePage} onPageChange={setActivePage} />
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
      <Dashboard />
    </QueryClientProvider>
  );
}
