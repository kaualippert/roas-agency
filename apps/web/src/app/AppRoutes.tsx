import {lazy,type ComponentType} from 'react';
import {Navigate,Route,Routes} from 'react-router-dom';
import {genericPageKeys} from './navigation';

type StyleLoader=()=>Promise<unknown>;
const page=(styles:StyleLoader[],load:()=>Promise<{default:ComponentType<any>}>)=>lazy(async()=>{await Promise.all(styles.map(style=>style()));return load()});
const css={
 dashboard:()=>import('../dashboard-connected.css'),dashboardCharts:()=>import('../dashboard-chart-loading.css'),salesGoal:()=>import('../sales-goal.css'),
 clients:()=>import('../clients-enhanced.css'),clientHub:()=>import('../client-hub.css'),clientFiles:()=>import('../client-files.css'),clientHubActions:()=>import('../client-hub-actions.css'),clientProcesses:()=>import('../client-processes.css'),clientMindMaps:()=>import('../client-mind-maps.css'),clientMindMapsFreeform:()=>import('../client-mind-maps-freeform.css'),
 onboarding:()=>import('../onboarding.css'),projects:()=>import('../projects-enhanced.css'),projectResponsibles:()=>import('../projects-responsibles.css'),projectBilling:()=>import('../project-billing.css'),projectsSocial:()=>import('../projects-social-link.css'),
 editorial:()=>import('../editorial.css'),editorialDescription:()=>import('../editorial-description.css'),editorialEditing:()=>import('../editorial-editing.css'),
 tasks:()=>import('../tasks-enhanced.css'),taskDescription:()=>import('../task-description.css'),taskDescriptionEnhanced:()=>import('../task-description-enhanced.css'),taskDetail:()=>import('../task-detail.css'),taskPreview:()=>import('../task-preview-toggle.css'),clientTask:()=>import('../client-task.css'),kanbanLimit:()=>import('../kanban-card-limit.css'),kanbanDensity:()=>import('../kanban-density.css'),
 teamReports:()=>import('../team-reports.css'),teamRoles:()=>import('../team-roles.css'),teamInvitations:()=>import('../team-invitations.css'),reportsFilters:()=>import('../reports-filters.css'),reportClient:()=>import('../report-client.css'),
 crm:()=>import('../prospects-crm.css'),crmPage:()=>import('../crm-page.css'),crmCompact:()=>import('../crm-pipeline-compact.css'),crmServices:()=>import('../crm-services.css'),crmServicesChart:()=>import('../crm-services-chart.css'),crmLead:()=>import('../crm-lead-manager.css'),crmHeader:()=>import('../crm-header.css'),crmImprovements:()=>import('../crm-improvements.css'),crmFunnel:()=>import('../crm-funnel.css'),crmUx:()=>import('../crm-ux-refresh.css'),
 finance:()=>import('../finance.css'),billing:()=>import('../billing-payments.css'),settings:()=>import('../settings.css'),agencyLogo:()=>import('../agency-logo-adjust.css'),serviceDark:()=>import('../service-dark-fix.css'),servicePricing:()=>import('../service-pricing.css'),
 marketingIntegrations:()=>import('../marketing-integrations.css'),marketingModule:()=>import('../marketing-module.css'),marketingMetrics:()=>import('../marketing-metrics.css'),notification:()=>import('../notification-center.css'),notificationEnhanced:()=>import('../notification-center-enhanced.css'),
};

const DashboardPage=page([css.dashboard,css.dashboardCharts,css.salesGoal],()=>import('../DashboardPage'));
const ClientsPage=page([css.clients],()=>import('../ClientsPageEnhanced'));
const ClientHubPage=page([css.clientHub,css.clientFiles,css.clientHubActions,css.clientProcesses,css.clientMindMaps,css.clientMindMapsFreeform],()=>import('../ClientHubPage'));
const OnboardingPage=page([css.onboarding],()=>import('../OnboardingPage'));
const ProjectsPage=page([css.projects,css.projectResponsibles,css.projectBilling,css.projectsSocial],()=>import('../pages/ProjectsPage'));
const EditorialPage=page([css.editorial,css.editorialDescription,css.editorialEditing],()=>import('../EditorialPage'));
const TasksPage=page([css.tasks,css.taskDescription,css.taskDescriptionEnhanced,css.taskDetail,css.taskPreview,css.clientTask,css.kanbanLimit,css.kanbanDensity],()=>import('../TasksPageEnhanced'));
const TeamPage=page([css.teamReports,css.teamRoles,css.teamInvitations],()=>import('../TeamPage'));
const ReportsPage=page([css.teamReports,css.reportsFilters,css.reportClient,css.marketingModule,css.marketingMetrics],()=>import('../ReportsPage'));
const CRMPage=page([css.crm,css.crmPage,css.crmCompact,css.crmServices,css.crmServicesChart,css.crmLead,css.crmHeader,css.crmImprovements,css.crmFunnel,css.crmUx,css.kanbanLimit,css.kanbanDensity],()=>import('../CRMPageEnhanced'));
const FinancePage=page([css.finance],()=>import('../FinancePage'));
const BillingPage=page([css.billing],()=>import('../BillingPaymentsPage').then(module=>({default:module.BillingPage})));
const PaymentsPage=page([css.billing],()=>import('../BillingPaymentsPage').then(module=>({default:module.PaymentsPage})));
const SettingsPage=page([css.settings,css.agencyLogo,css.serviceDark,css.servicePricing],()=>import('../SettingsPage'));
const MarketingIntegrationsPage=page([css.marketingIntegrations,css.marketingModule,css.marketingMetrics],()=>import('../MarketingIntegrationsPage'));
const MarketingDashboardPage=page([css.marketingModule,css.marketingMetrics],()=>import('../MarketingDashboardPage'));
const GenericPage=page([],()=>import('../pages/GenericPage'));

export default function AppRoutes(){
 return <Routes>
  <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
  <Route path="/dashboard" element={<DashboardPage/>}/>
  <Route path="/clients" element={<ClientsPage/>}/>
  <Route path="/clients/:clientId" element={<ClientHubPage/>}/>
  <Route path="/onboarding" element={<OnboardingPage/>}/>
  <Route path="/projects" element={<ProjectsPage/>}/>
  <Route path="/projects/:projectId/editorial" element={<EditorialPage/>}/>
  <Route path="/tasks" element={<TasksPage/>}/>
  <Route path="/team" element={<TeamPage/>}/>
  <Route path="/marketing/dashboard" element={<MarketingDashboardPage/>}/>
  <Route path="/marketing/integrations" element={<MarketingIntegrationsPage/>}/>
  <Route path="/marketing/reports" element={<ReportsPage/>}/>
  <Route path="/reports" element={<Navigate to="/marketing/reports" replace/>}/>
  <Route path="/crm" element={<CRMPage/>}/>
  <Route path="/integrations" element={<Navigate to="/marketing/integrations" replace/>}/>
  <Route path="/campaigns" element={<Navigate to="/marketing/integrations" replace/>}/>
  <Route path="/ads" element={<Navigate to="/marketing/dashboard" replace/>}/>
  <Route path="/creatives" element={<Navigate to="/marketing/dashboard" replace/>}/>
  <Route path="/finance" element={<FinancePage/>}/>
  <Route path="/invoices" element={<BillingPage/>}/>
  <Route path="/payments" element={<PaymentsPage/>}/>
  <Route path="/settings" element={<SettingsPage/>}/>
  {genericPageKeys.map(type=><Route key={type} path={`/${type}`} element={<GenericPage type={type}/>}/>)}
  <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
 </Routes>
}
