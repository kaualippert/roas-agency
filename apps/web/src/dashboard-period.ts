export type DashboardPeriod='month'|'30d'|'90d'|'6m'|'12m';

export const dashboardPeriods:Record<DashboardPeriod,{label:string;days?:number}>={
 month:{label:'Este mês'},
 '30d':{label:'Últimos 30 dias',days:30},
 '90d':{label:'Últimos 90 dias',days:90},
 '6m':{label:'Últimos 6 meses',days:183},
 '12m':{label:'Últimos 12 meses',days:365},
};

export function dashboardPeriodStart(period:DashboardPeriod,reference=new Date()){
 const date=new Date(reference);
 if(period==='month')date.setDate(1);
 else date.setDate(date.getDate()-(dashboardPeriods[period].days||0));
 date.setHours(0,0,0,0);
 return date;
}
