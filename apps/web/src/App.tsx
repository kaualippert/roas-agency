import {lazy,Suspense} from 'react';
import {Navigate,Route,Routes} from 'react-router-dom';
import AppLayout from './app/AppLayout';
import {genericPageKeys} from './app/navigation';
import RouteUiState from './RouteUiState';

const DashboardPage=lazy(()=>import('./DashboardPage'));
const ClientsPage=lazy(()=>import('./ClientsPageEnhanced'));
const ClientHubPage=lazy(()=>import('./ClientHubPage'));
const OnboardingPage=lazy(()=>import('./OnboardingPage'));
const ProjectsPage=lazy(()=>import('./pages/ProjectsPage'));
const EditorialPage=lazy(()=>import('./EditorialPage'));
const TasksPage=lazy(()=>import('./TasksPageEnhanced'));
const TeamPage=lazy(()=>import('./TeamPage'));
const ReportsPage=lazy(()=>import('./ReportsPage'));
const CRMPage=lazy(()=>import('./CRMPageEnhanced'));
const FinancePage=lazy(()=>import('./FinancePage'));
const BillingPage=lazy(()=>import('./BillingPaymentsPage').then(module=>({default:module.BillingPage})));
const PaymentsPage=lazy(()=>import('./BillingPaymentsPage').then(module=>({default:module.PaymentsPage})));
const SettingsPage=lazy(()=>import('./SettingsPage'));
const MarketingIntegrationsPage=lazy(()=>import('./MarketingIntegrationsPage'));
const GenericPage=lazy(()=>import('./pages/GenericPage'));
const CRMServicesAnalytics=lazy(()=>import('./CRMServicesAnalytics'));
const CRMLeadManager=lazy(()=>import('./CRMLeadManager'));
const NotificationCenter=lazy(()=>import('./NotificationCenter'));

export default function App(){
 return <div className="app"><RouteUiState/><AppLayout><Suspense fallback={<main className="routeLoading"><span/><span/><span/></main>}><Routes><Route path="/" element={<Navigate to="/dashboard" replace/>}/><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/clients" element={<ClientsPage/>}/><Route path="/clients/:clientId" element={<ClientHubPage/>}/><Route path="/onboarding" element={<OnboardingPage/>}/><Route path="/projects" element={<ProjectsPage/>}/><Route path="/projects/:projectId/editorial" element={<EditorialPage/>}/><Route path="/tasks" element={<TasksPage/>}/><Route path="/team" element={<TeamPage/>}/><Route path="/reports" element={<ReportsPage/>}/><Route path="/crm" element={<CRMPage/>}/><Route path="/integrations" element={<MarketingIntegrationsPage/>}/><Route path="/campaigns" element={<Navigate to="/integrations" replace/>}/><Route path="/finance" element={<FinancePage/>}/><Route path="/invoices" element={<BillingPage/>}/><Route path="/payments" element={<PaymentsPage/>}/><Route path="/settings" element={<SettingsPage/>}/>{genericPageKeys.map(type=><Route key={type} path={`/${type}`} element={<GenericPage type={type}/>}/>) }<Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes><CRMServicesAnalytics/></Suspense></AppLayout><Suspense fallback={null}><CRMLeadManager/><NotificationCenter/></Suspense></div>
}
