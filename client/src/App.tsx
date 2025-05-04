import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import PageNotFound from "@/pages/page-not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DashboardPage from "@/pages/dashboard-page";
import ContactsPage from "@/pages/contacts-page";
import ContactDetailsPage from "@/pages/contact-details-page";
import AnalyticsPage from "@/pages/analytics-page";
import SettingsPage from "@/pages/settings-page";
import CrmPage from "@/pages/crm-page";
import InboxPage from "@/pages/inbox-page";
import ConversationsPage from "@/pages/conversations-page";
import WebhookQueuePage from "@/pages/webhook-queue-page";
import RoutingRulesPage from "@/pages/routing-rules-page";
import AutomationsPage from "@/pages/automations-page";
import UsersPage from "@/pages/users-page";
import TemplatesPage from "@/pages/templates-page";
import MetricsPage from "@/pages/metrics-page";
import CacheAdminPage from "@/pages/cache-admin-page";
import BackupsAdminPage from "./pages/backups-admin-page";
import DealPage from "@/pages/deal-page";
import CreateDealPage from "@/pages/create-deal-page";
import CreateActivityPage from "@/pages/create-activity-page";

import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/home" component={HomePage} />
      <ProtectedRoute path="/inbox" component={InboxPage} />
      <ProtectedRoute path="/conversations" component={ConversationsPage} />
      <ProtectedRoute path="/contacts" component={ContactsPage} />
      <ProtectedRoute path="/contact/:id" component={ContactDetailsPage} />
      <ProtectedRoute path="/crm" component={CrmPage} />
      <ProtectedRoute path="/deal/:id" component={DealPage} />
      <ProtectedRoute path="/create-deal" component={CreateDealPage} />
      <ProtectedRoute path="/contact/:contactId/create-deal" component={CreateDealPage} />
      <ProtectedRoute path="/create-activity" component={CreateActivityPage} />
      <ProtectedRoute path="/contact/:contactId/create-activity" component={CreateActivityPage} />
      <ProtectedRoute path="/deal/:dealId/create-activity" component={CreateActivityPage} />
      <ProtectedRoute path="/automations" component={AutomationsPage} />
      <ProtectedRoute path="/metrics" component={MetricsPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/webhook-queue" component={WebhookQueuePage} />
      <ProtectedRoute path="/routing-rules" component={RoutingRulesPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/templates" component={TemplatesPage} />
      <ProtectedRoute path="/admin/cache" component={CacheAdminPage} />
      <ProtectedRoute path="/admin/backups" component={BackupsAdminPage} />

      <Route path="/auth" component={AuthPage} />
      <Route component={PageNotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
