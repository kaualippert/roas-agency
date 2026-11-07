import {Activity,Eye,Heart,MousePointerClick,Play,Target,WalletCards,type LucideIcon} from 'lucide-react';
import {MetricHelp} from './DashboardReading';
import {MarketingMetricDelta,type useMarketingComparison} from './MarketingComparison';
import type {marketingMetricCatalog} from './marketing-dashboard-config';

type Definition=(typeof marketingMetricCatalog)[number];
const groups={
 'Desempenho':{Icon:Activity,tone:'accent'},
 'Entrega':{Icon:Eye,tone:'blue'},
 'Cliques e tráfego':{Icon:MousePointerClick,tone:'blue'},
 'Engajamento':{Icon:Heart,tone:'accent'},
 'Vídeo':{Icon:Play,tone:'accent'},
 'Leads e conversões':{Icon:Target,tone:'green'},
} satisfies Record<Definition['category'],{Icon:LucideIcon;tone:string}>;

export default function MarketingMetricCard({definition,period,value,comparison}:{definition:Definition;period:string;value:string;comparison:ReturnType<typeof useMarketingComparison>}){
 const {id,label,description,category,format}=definition;
 const {Icon,tone}=format==='currency'?{Icon:WalletCards,tone:'accent'}:groups[category];
 return <article className="card marketingOverviewMetric" data-metric={id} data-tone={tone}>
  <div className="marketingOverviewMetricTop">
   <div className="marketingOverviewMetricIcon"><Icon aria-hidden="true"/></div>
   <MetricHelp label={label} description={`${description}. Período dos dados sincronizados: ${period}. ${format==='currency'?'Valores atribuídos pela plataforma de anúncios; não representam recebimentos do financeiro.':''}`}/>
  </div>
  <small>{label}</small>
  <strong>{value}</strong>
  <MarketingMetricDelta id={id} comparison={comparison}/>
 </article>;
}
