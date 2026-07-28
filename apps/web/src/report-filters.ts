import type {GenericItem} from './types';

export type ReportStatusFilter='all'|'pending'|'sent';
export type ReportPeriodFilter='all'|'this_month'|'last_month'|'last_3_months';

function dateFromReport(report:GenericItem){
 const value=report.date||report.updatedAt||report.createdAt;
 if(!value)return null;
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0,10));
 if(!match)return null;
 const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
 return Number.isNaN(date.getTime())?null:date;
}

function monthIndex(date:Date){return date.getFullYear()*12+date.getMonth()}

export function reportMatchesStatus(report:GenericItem,status:ReportStatusFilter){
 if(status==='all')return true;
 const normalized=report.status.trim().toLocaleLowerCase('pt-BR');
 return status==='sent'?normalized==='enviado':normalized==='pendente';
}

export function reportMatchesPeriod(report:GenericItem,period:ReportPeriodFilter,referenceDate=new Date()){
 if(period==='all')return true;
 const date=dateFromReport(report);
 if(!date)return false;
 const difference=monthIndex(referenceDate)-monthIndex(date);
 if(period==='this_month')return difference===0;
 if(period==='last_month')return difference===1;
 return difference>=0&&difference<=2;
}

export function filterReports(
 reports:GenericItem[],
 query:string,
 status:ReportStatusFilter,
 period:ReportPeriodFilter,
 referenceDate=new Date(),
){
 const normalizedQuery=query.trim().toLocaleLowerCase('pt-BR');
 return reports.filter(report=>{
  const matchesQuery=!normalizedQuery||
   report.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery)||
   (report.description||'').toLocaleLowerCase('pt-BR').includes(normalizedQuery);
  return matchesQuery&&reportMatchesStatus(report,status)&&reportMatchesPeriod(report,period,referenceDate);
 });
}
