import {formatMarketingMetric,marketingMetricCatalog,type MarketingMetricKey} from './marketing-dashboard-config';

export interface ShareableReport{
 name:string;
 clientName:string;
 period:string;
 description?:string;
 recommendations?:string;
 metricIds:MarketingMetricKey[];
 metricValues:Partial<Record<MarketingMetricKey,number>>;
 agencyName:string;
}

export function buildReportShareText(report:ShareableReport){
 const metrics=report.metricIds.slice(0,8).map(id=>{
  const label=marketingMetricCatalog.find(metric=>metric.id===id)?.label||id;
  return `• ${label}: ${formatMarketingMetric(id,Number(report.metricValues[id])||0)}`;
 });
 return [report.name,`${report.clientName} · ${report.period}`,'',...metrics,report.description&&`\nResumo: ${report.description}`,report.recommendations&&`\nPróximos passos: ${report.recommendations}`,`\nPreparado por ${report.agencyName}`].filter(Boolean).join('\n');
}

export function reportEmailUrl(email:string,subject:string,body:string){
 return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function reportWhatsAppUrl(body:string,phone=''){
 const digits=phone.replace(/\D/g,'');
 return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}
