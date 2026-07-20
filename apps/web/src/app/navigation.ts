import type {LucideIcon} from 'lucide-react';
import {Badge,BriefcaseBusiness,ChartNoAxesColumn,ChartNoAxesCombined,ClipboardCheck,ClipboardList,CreditCard,FolderKanban,Funnel,House,Image,Layers,Megaphone,ReceiptText,Settings,SlidersHorizontal,Users,UsersRound} from 'lucide-react';

export type PageMeta={title:string;sub:string};

export const pageMeta:Record<string,PageMeta>={
 dashboard:{title:'Dashboard',sub:'Visão geral da sua agência'},
 clients:{title:'Clientes',sub:'Gerencie seus clientes e acompanhe o desempenho de cada conta.'},
 onboarding:{title:'Onboarding',sub:'Acompanhe a entrada de novos clientes até o início da operação.'},
 projects:{title:'Projetos',sub:'Acompanhe todos os projetos da sua agência em um só lugar.'},
 tasks:{title:'Tarefas',sub:'Organize, acompanhe e conclua todas as atividades da sua agência.'},
 crm:{title:'CRM',sub:'Gerencie o funil comercial e acompanhe sua prospecção.'},
 campaigns:{title:'Campanhas',sub:'Gerencie campanhas e acompanhe seus resultados.'},
 ads:{title:'Anúncios',sub:'Organize peças, copies e anúncios.'},
 reports:{title:'Relatórios',sub:'Crie e acompanhe relatórios dos clientes.'},
 creatives:{title:'Criativos',sub:'Sua biblioteca visual centralizada.'},
 finance:{title:'Financeiro',sub:'Receitas, cobranças e previsões conectadas aos seus clientes.'},
 invoices:{title:'Faturamento',sub:'Controle sua receita, cobranças e vencimentos.'},
 payments:{title:'Pagamentos',sub:'Acompanhe os pagamentos recebidos.'},
 team:{title:'Equipe',sub:'Pessoas, funções e capacidade do time.'},
 integrations:{title:'Integrações',sub:'Conecte as ferramentas da sua operação.'},
 settings:{title:'Configurações',sub:'Personalize a experiência da sua agência.'},
};

export type NavItem={path:string;label:string;icon:LucideIcon};
export type NavGroup={label:string;items:NavItem[]};

export const navGroups:NavGroup[]=[
 {label:'',items:[{path:'dashboard',label:'Dashboard',icon:House}]},
 {label:'GERAL',items:[{path:'clients',label:'Clientes',icon:Users},{path:'onboarding',label:'Onboarding',icon:ClipboardList},{path:'projects',label:'Projetos',icon:BriefcaseBusiness},{path:'tasks',label:'Tarefas',icon:ClipboardCheck},{path:'crm',label:'CRM',icon:Funnel}]},
 {label:'MARKETING',items:[{path:'campaigns',label:'Campanhas',icon:Megaphone},{path:'ads',label:'Anúncios',icon:Badge},{path:'reports',label:'Relatórios',icon:ChartNoAxesColumn},{path:'creatives',label:'Criativos',icon:Image}]},
 {label:'FINANCEIRO',items:[{path:'finance',label:'Visão financeira',icon:ChartNoAxesCombined},{path:'invoices',label:'Faturamento',icon:ReceiptText},{path:'payments',label:'Pagamentos',icon:CreditCard}]},
 {label:'CONFIGURAÇÕES',items:[{path:'team',label:'Equipe',icon:UsersRound},{path:'integrations',label:'Integrações',icon:SlidersHorizontal},{path:'settings',label:'Configurações',icon:Settings}]},
];

export const genericPageKeys=['campaigns','ads','creatives','invoices','payments','integrations'] as const;
export const genericPageIcon:Record<string,LucideIcon>={campaigns:Megaphone,ads:Badge,creatives:Image,invoices:ReceiptText,payments:CreditCard,integrations:SlidersHorizontal,default:Layers,folder:FolderKanban};
