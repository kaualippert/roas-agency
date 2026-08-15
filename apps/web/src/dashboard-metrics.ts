import {dashboardDateInRange,type DashboardPeriodRange} from './dashboard-period';

type DatedFinancialEntry={status:'pending'|'received';dueDate:string;receivedAt?:string};

export function dueEntriesInRange<T extends DatedFinancialEntry>(entries:T[],range:DashboardPeriodRange){
 return entries.filter(entry=>dashboardDateInRange(entry.dueDate,range));
}

export function receivedEntriesInRange<T extends DatedFinancialEntry>(entries:T[],range:DashboardPeriodRange){
 return entries.filter(entry=>entry.status==='received'&&dashboardDateInRange(entry.receivedAt,range));
}
