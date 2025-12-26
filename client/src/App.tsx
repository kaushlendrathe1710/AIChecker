import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import UploadPage from "@/pages/upload";
import DocumentsPage from "@/pages/documents";
import ReportPage from "@/pages/report";
import AiCheckPage from "@/pages/ai-check";
import PlagiarismCheckPage from "@/pages/plagiarism-check";
import GrammarCheckPage from "@/pages/grammar-check";
import FileConverterPage from "@/pages/file-converter";
import SubscriptionPage from "@/pages/subscription";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminSubscriptions from "@/pages/admin/subscriptions";
import AdminDocuments from "@/pages/admin/documents";
import AdminManagement from "@/pages/admin/admins";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading, needsRegistration } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (needsRegistration) {
    return <Redirect to="/register" />;
  }

  return <Component />;
}

function AdminRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading, needsRegistration, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (needsRegistration) {
    return <Redirect to="/register" />;
  }

  if (!user?.isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function AuthRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading, needsRegistration } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isAuthenticated && !needsRegistration) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/">
        <LandingPage />
      </Route>
      <Route path="/login">
        <AuthRoute component={LoginPage} />
      </Route>
      <Route path="/register">
        <RegisterPage />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute
          component={() => (
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          )}
        />
      </Route>
      <Route path="/upload">
        <ProtectedRoute
          component={() => (
            <DashboardLayout>
              <UploadPage />
            </DashboardLayout>
          )}
        />
      </Route>
      <Route path="/documents">
        <ProtectedRoute
          component={() => (
            <DashboardLayout>
              <DocumentsPage />
            </DashboardLayout>
          )}
        />
      </Route>
      <Route path="/report/:id">
        <ProtectedRoute
          component={() => (
            <DashboardLayout>
              <ReportPage />
            </DashboardLayout>
          )}
        />
      </Route>
      <Route path="/ai-check">
        <ProtectedRoute
          component={() => (
            <DashboardLayout>
              <AiCheckPage />
            </DashboardLayout>
          )}
        />
      </Route>
      <Route path="/plagiarism-check">
        <ProtectedRoute
          component={() => (
            <DashboardLayout>
              <PlagiarismCheckPage />
            </DashboardLayout>
          )}
        />
      </Route>
      <Route path="/grammar-check">
        <ProtectedRoute
          component={() => (
            <DashboardLayout>
              <GrammarCheckPage />
            </DashboardLayout>
          )}
        />
      </Route>
      <Route path="/file-converter">
        <ProtectedRoute
          component={() => (
            <DashboardLayout>
              <FileConverterPage />
            </DashboardLayout>
          )}
        />
      </Route>
      <Route path="/subscription">
        <ProtectedRoute
          component={() => (
            <DashboardLayout>
              <SubscriptionPage />
            </DashboardLayout>
          )}
        />
      </Route>
      <Route path="/admin">
        <AdminRoute
          component={() => (
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          )}
        />
      </Route>
      <Route path="/admin/users">
        <AdminRoute
          component={() => (
            <AdminLayout>
              <AdminUsers />
            </AdminLayout>
          )}
        />
      </Route>
      <Route path="/admin/subscriptions">
        <AdminRoute
          component={() => (
            <AdminLayout>
              <AdminSubscriptions />
            </AdminLayout>
          )}
        />
      </Route>
      <Route path="/admin/documents">
        <AdminRoute
          component={() => (
            <AdminLayout>
              <AdminDocuments />
            </AdminLayout>
          )}
        />
      </Route>
      <Route path="/admin/admins">
        <AdminRoute
          component={() => (
            <AdminLayout>
              <AdminManagement />
            </AdminLayout>
          )}
        />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppRouter />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
