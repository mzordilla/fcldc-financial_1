import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Receivables from './pages/Receivables';
import WorkingCapitalLoans from './pages/WorkingCapitalLoans';

import Payables from './pages/Payables';
import BankLoans from './pages/BankLoans';
import ProjectPnL from './pages/ProjectPnL';
import Projects from './pages/Projects';
import PurchaseOrders from './pages/PurchaseOrders';
import PaymentApprovals from './pages/PaymentApprovals';
import BankAccounts from './pages/BankAccounts';
import Reports from './pages/Reports';
import ChartOfAccounts from './pages/ChartOfAccounts';
import ReceiptScanner from './pages/ReceiptScanner';
import Payees from './pages/Payees';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project-pnl" element={<ProjectPnL />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/payment-approvals" element={<PaymentApprovals />} />
        <Route path="/receivables" element={<Receivables />} />
        <Route path="/payables" element={<Payables />} />

        <Route path="/bank-loans" element={<BankLoans />} />
        <Route path="/working-capital-loans" element={<WorkingCapitalLoans />} />
        <Route path="/bank-accounts" element={<BankAccounts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
        <Route path="/receipt-scanner" element={<ReceiptScanner />} />
        <Route path="/payees" element={<Payees />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App