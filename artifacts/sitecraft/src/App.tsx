import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from "@workspace/replit-auth-web";
import { AppLayout } from '@/components/layout/app-layout';
import { ErrorBoundary } from '@/components/error-boundary';

import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import NewProject from '@/pages/new-project';
import GenerateProject from '@/pages/generate';
import ProjectEditor from '@/pages/editor';
import ProjectVersions from '@/pages/versions';
import Deployments from '@/pages/deployments';
import Prompts from '@/pages/prompts';
import SettingsPage from '@/pages/settings';

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

      {/* Protected Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/new">
        {() => <ProtectedRoute component={NewProject} />}
      </Route>
      <Route path="/projects/:id/generate">
        {() => <ProtectedRoute component={GenerateProject} />}
      </Route>
      <Route path="/projects/:id/editor">
        {() => <ProtectedRoute component={ProjectEditor} />}
      </Route>
      <Route path="/projects/:id/versions">
        {() => <ProtectedRoute component={ProjectVersions} />}
      </Route>
      <Route path="/deployments">
        {() => <ProtectedRoute component={Deployments} />}
      </Route>
      <Route path="/prompts">
        {() => <ProtectedRoute component={Prompts} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
