import type {LucideIcon} from 'lucide-react';
import {BriefcaseBusiness,ChartNoAxesColumn,ChartNoAxesCombined,ClipboardCheck,ClipboardList,CreditCard,FolderKanban,Funnel,House,Layers,LayoutDashboard,PlugZap,ReceiptText,Settings,Users,UsersRound} from 'lucide-react';

export type PageMeta={title:string;sub:string};

export const pageMeta:Record<string,PageMeta>={
 dashboard:{title:'Dashboard',sub:'Visão geral da sua agência'},
 clients:{title:'Clientes',sub:'Gerencie seus clientes e acompanhe o desempenho de cada conta.'},
 onboarding:{title:'Onboarding',sub:'Acompanhe a entrada de novos clientes até o início da operação.'},
 projects:{title:'Projetos',sub:'Acompanhe todos os projetos da sua agência em um só lugar.'},
 tasks:{title:'Tarefas',sub:'Organize, acompanhe e conclua todas as atividades da sua agência.'},
 crm:{title:'CRM',sub:'Gerencie o funil comercial e acompanhe sua prospecção.'},
 'marketing/dashboard':{title:'Marketing',sub:'Visão consolidada das marcas, canais e integrações.'},
 'marketing/integrations':{title:'Integrações de marca',sub:'Vincule as contas de mídia e presença digital de cada cliente.'},
 'marketing/reports':{title:'Relatórios de marketing',sub:'Crie e acompanhe relatórios dos clientes.'},
 reports:{title:'Relatórios',sub:'Crie e acompanhe relatórios dos clientes.'},
 finance:{title:'Financeiro',sub:'Receitas, cobranças e previsões conectadas aos seus clientes.'},
 invoices:{title:'Faturamento',sub:'Controle sua receita, cobranças e vencimentos.'},
 payments:{title:'Pagamentos',sub:'Acompanhe os pagamentos recebidos.'},
 team:{title:'Equipe',sub:'Pessoas, funções e capacidade do time.'},
 integrations:{title:'Integrações de marca',sub:'Vincule as contas de mídia e presença digital de cada cliente.'},
 settings:{title:'Configurações',sub:'Personalize a experiência da sua agência.'},
};

export type NavItem={path:string;label:string;icon:LucideIcon};
export type NavGroup={label:string;items:NavItem[]};

export const navGroups:NavGroup[]=[
 {label:'',items:[{path:'dashboard',label:'Dashboard',icon:House}]},
 {label:'GERAL',items:[{path:'clients',label:'Clientes',icon:Users},{path:'onboarding',label:'Onboarding',icon:ClipboardList},{path:'projects',label:'Projetos',icon:BriefcaseBusiness},{path:'tasks',label:'Tarefas',icon:ClipboardCheck},{path:'crm',label:'CRM',icon:Funnel}]},
 {label:'MARKETING',items:[{path:'marketing/dashboard',label:'Dashboard',icon:LayoutDashboard},{path:'marketing/integrations',label:'Integrações de marca',icon:PlugZap},{path:'marketing/reports',label:'Relatórios',icon:ChartNoAxesColumn}]},
 {label:'FINANCEIRO',items:[{path:'finance',label:'Visão financeira',icon:ChartNoAxesCombined},{path:'invoices',label:'Faturamento',icon:ReceiptText},{path:'payments',label:'Pagamentos',icon:CreditCard}]},
 {label:'CONFIGURAÇÕES',items:[{path:'team',label:'Equipe',icon:UsersRound},{path:'settings',label:'Configurações',icon:Settings}]},
];

export const genericPageKeys=[] as const;
export const genericPageIcon:Record<string,LucideIcon>={invoices:ReceiptText,payments:CreditCard,integrations:PlugZap,default:Layers,folder:FolderKanban};
