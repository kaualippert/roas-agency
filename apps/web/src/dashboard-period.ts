export type DashboardPeriod='month'|'30d'|'90d'|'6m'|'12m';
export type DashboardPeriodRange={from:Date;to:Date};

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

export function dashboardPeriodRange(period:DashboardPeriod,reference=new Date()):DashboardPeriodRange{
 const to=new Date(reference);
 to.setHours(23,59,59,999);
 return {from:dashboardPeriodStart(period,reference),to};
}

export function dashboardDateInRange(value:string|undefined,range:DashboardPeriodRange){
 if(!value)return false;
 const date=new Date(value.length===10?`${value}T12:00:00`:value);
 return !Number.isNaN(date.getTime())&&date>=range.from&&date<=range.to;
}
