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
import { Placeholder } from './pages/Placeholder';

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
      <div className="min-h-screen flex items-center justify-center bg-[#F7F6F3]">
        <p className="text-[#8A94A0]">Loading...</p>
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
        return <Placeholder title="Withdrawals" cycle={3} />;
      case 'funnel':
        return <Placeholder title="Funnel by Type" cycle={3} />;
      case 'properties':
        return <Placeholder title="Property Cards" cycle={4} />;
      case 'crm-vs-acc':
        return <Placeholder title="CRM vs Accountability Report" cycle={5} />;
      case 'gci':
        return <Placeholder title="Τζίρος & Κατάταξη" cycle={5} />;
      default:
        return <Overview period={period} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F3]">
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
