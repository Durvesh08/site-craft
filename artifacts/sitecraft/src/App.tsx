import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { AppLayout } from '@/components/layout/app-layout';
import { ErrorBoundary } from '@/components/error-boundary';

import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import ProjectsList from '@/pages/projects-list';
import NewProject from '@/pages/new-project';
import GenerateProject from '@/pages/generate';
import ProjectEditor from '@/pages/editor';
import ProjectPreview from '@/pages/project-preview';
import ProjectCode from '@/pages/project-code';
import ProjectFiles from '@/pages/project-files';
import ProjectAssets from '@/pages/project-assets';
import DomainsPage from '@/pages/domains-page';
import DeploymentsPage from '@/pages/deployments-page';
import VersionsPage from '@/pages/versions-page';
import AnalyticsPage from '@/pages/analytics-page';
import ProjectSettingsPage from '@/pages/project-settings-page';
import TemplatesPage from '@/pages/templates-page';
import BillingPage from '@/pages/billing-page';
import SettingsPage from '@/pages/settings';
import StandalonePreviewRoute from '@/pages/standalone-preview-route';

const queryClient = new QueryClient();

// A simple protected route wrapper
function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <AppLayout>
      <Component {...rest} />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />

      {/* Isolated Standalone Project Preview Frame (Zero Zovaix Platform Shell) */}
      <Route path="/preview-frame/:id" component={StandalonePreviewRoute} />

      {/* Protected Product Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={ProjectsList} />}
      </Route>
      <Route path="/projects/:id/build">
        {() => <ProtectedRoute component={ProjectEditor} />}
      </Route>
      <Route path="/projects/:id/editor">
        {() => <ProtectedRoute component={ProjectEditor} />}
      </Route>
      <Route path="/projects/:id/preview">
        {() => <ProtectedRoute component={ProjectPreview} />}
      </Route>
      <Route path="/projects/:id/code">
        {() => <ProtectedRoute component={ProjectCode} />}
      </Route>
      <Route path="/projects/:id/files">
        {() => <ProtectedRoute component={ProjectFiles} />}
      </Route>
      <Route path="/projects/:id/assets">
        {() => <ProtectedRoute component={ProjectAssets} />}
      </Route>
      <Route path="/projects/:id/domains">
        {() => <ProtectedRoute component={DomainsPage} />}
      </Route>
      <Route path="/projects/:id/deployments">
        {() => <ProtectedRoute component={DeploymentsPage} />}
      </Route>
      <Route path="/projects/:id/versions">
        {() => <ProtectedRoute component={VersionsPage} />}
      </Route>
      <Route path="/projects/:id/analytics">
        {() => <ProtectedRoute component={AnalyticsPage} />}
      </Route>
      <Route path="/projects/:id/generate">
        {() => <ProtectedRoute component={GenerateProject} />}
      </Route>
      <Route path="/projects/:id/settings">
        {() => <ProtectedRoute component={ProjectSettingsPage} />}
      </Route>
      <Route path="/projects/:id">
        {() => <ProtectedRoute component={ProjectEditor} />}
      </Route>


      <Route path="/domains">
        {() => <ProtectedRoute component={DomainsPage} />}
      </Route>
      <Route path="/templates">
        {() => <ProtectedRoute component={TemplatesPage} />}
      </Route>
      <Route path="/billing">
        {() => <ProtectedRoute component={BillingPage} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>

      <Route path="/new">
        {() => <ProtectedRoute component={NewProject} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </ErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
