import React, { useState } from 'react';
import { AdminPanel } from './components/admin/AdminPanel';
import { AuthModal } from './components/shared/AuthModal';
import { MembershipModal } from './components/shared/MembershipModal';
import { ToastContainer } from './components/shared/ToastContainer';
import { AddFundsView } from './components/user/AddFundsView';
import { DashboardView } from './components/user/DashboardView';
import { NewOrderView } from './components/user/NewOrderView';
import { OrdersView } from './components/user/OrdersView';
import { ReferralsView } from './components/user/ReferralsView';
import { ServicesView } from './components/user/ServicesView';
import { SettingsView } from './components/user/SettingsView';
import { SupportView } from './components/user/SupportView';
import { TopAccountSummary } from './components/user/TopAccountSummary';
import { TransactionsView } from './components/user/TransactionsView';
import { UserSidebar } from './components/user/UserSidebar';
import { UserTopBar } from './components/user/UserTopBar';
import { AppProvider, useApp } from './contexts/AppContext';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#090414] text-white">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 space-y-3 text-center">
            <h1 className="text-lg font-bold">Application Recovery</h1>
            <p className="text-xs text-violet-200/80 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="neon-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const { authReady, appMode, userRoute } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#090414] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-sky-500 animate-pulse" />
          <p className="text-xs font-semibold tracking-widest uppercase text-violet-300">
            Loading MAHIR DEV SMM Panel...
          </p>
        </div>
      </div>
    );
  }

  if (appMode === 'admin') {
    return (
      <>
        <AdminPanel />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#090414] text-[#F5F2FF] relative overflow-x-hidden">
      {/* Subtle Futuristic Midnight Purple Ambient Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle at 12% 10%, rgba(124, 58, 237, 0.16) 0%, transparent 42%), radial-gradient(circle at 88% 18%, rgba(37, 99, 235, 0.14) 0%, transparent 40%), radial-gradient(circle at 50% 90%, rgba(109, 40, 217, 0.12) 0%, transparent 50%)',
        }}
        aria-hidden="true"
      />

      <UserSidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <UserTopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1380px] w-full mx-auto">
          <TopAccountSummary />

          {userRoute === 'dashboard' && <DashboardView />}
          {userRoute === 'new-order' && <NewOrderView />}
          {userRoute === 'orders' && <OrdersView />}
          {userRoute === 'services' && <ServicesView />}
          {userRoute === 'add-funds' && <AddFundsView />}
          {userRoute === 'transactions' && <TransactionsView />}
          {userRoute === 'referrals' && <ReferralsView />}
          {userRoute === 'support' && <SupportView />}
          {userRoute === 'settings' && <SettingsView />}
        </main>
      </div>

      <AuthModal />
      <MembershipModal />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  );
}
