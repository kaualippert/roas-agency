import React from 'react'; import {createRoot} from 'react-dom/client'; import App from './App'; import {BrowserRouter} from 'react-router-dom'; import {store} from './storage'; import './styles.css'; import './settings.css'; import './team-reports.css'; import './team-roles.css'; import './client-task.css'; import './dark-theme.css'; import './prospects-crm.css'; import './crm-page.css'; import './sidebar-collapse.css'; import './sidebar-toggle-fix.css'; import './sidebar-preference.css'; import './crm-pipeline-compact.css'; import './crm-services.css'; import './crm-services-chart.css'; import './crm-lead-manager.css'; import './service-dark-fix.css'; import './service-pricing.css'; import './crm-header.css'; import './notification-center.css'; import './clients-enhanced.css'; import './onboarding.css'; import './finance.css'; import './dashboard-connected.css'; import './client-hub.css'; import './tasks-enhanced.css'; import './projects-enhanced.css'; import './readability.css';
const savedTheme=localStorage.getItem('roas_theme')||'light'; document.documentElement.dataset.theme=savedTheme==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):savedTheme;
const root=createRoot(document.getElementById('root')!);
try{
 await store.init();
 root.render(<React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>);
}catch(error){
 console.error('Falha ao carregar dados da API.',error);
 root.render(<main className="apiUnavailable"><section className="card"><h1>Não foi possível carregar os dados</h1><p>A API ou o MongoDB está indisponível. O sistema não usa dados demonstrativos nem cache local.</p><button className="btn" onClick={()=>location.reload()}>Tentar novamente</button></section></main>);
}
