export type MarketingPeriodKey='today'|'yesterday'|'today_yesterday'|'last_7'|'last_14'|'last_28'|'last_30'|'this_week'|'last_week'|'this_month'|'last_month'|'maximum';

export const marketingPeriodOptions:Array<{id:MarketingPeriodKey;label:string}>=[
 {id:'today',label:'Hoje'},
 {id:'yesterday',label:'Ontem'},
 {id:'today_yesterday',label:'Hoje e ontem'},
 {id:'last_7',label:'Últimos 7 dias'},
 {id:'last_14',label:'Últimos 14 dias'},
 {id:'last_28',label:'Últimos 28 dias'},
 {id:'last_30',label:'Últimos 30 dias'},
 {id:'this_week',label:'Esta semana'},
 {id:'last_week',label:'Semana passada'},
 {id:'this_month',label:'Este mês'},
 {id:'last_month',label:'Mês passado'},
 {id:'maximum',label:'Máximo'},
];

const localDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const atMidnight=(reference:Date)=>new Date(reference.getFullYear(),reference.getMonth(),reference.getDate());
const addDays=(date:Date,days:number)=>new Date(date.getFullYear(),date.getMonth(),date.getDate()+days);

export function marketingPeriodRange(key:MarketingPeriodKey,reference=new Date()){
 const today=atMidnight(reference),yesterday=addDays(today,-1);
 let from=today,to=today;
 switch(key){
  case 'yesterday':from=yesterday;to=yesterday;break;
  case 'today_yesterday':from=yesterday;break;
  case 'last_7':from=addDays(today,-6);break;
  case 'last_14':from=addDays(today,-13);break;
  case 'last_28':from=addDays(today,-27);break;
  case 'last_30':from=addDays(today,-29);break;
  case 'this_week':from=addDays(today,-((today.getDay()+6)%7));break;
  case 'last_week':{const monday=addDays(today,-((today.getDay()+6)%7));from=addDays(monday,-7);to=addDays(monday,-1);break}
  case 'this_month':from=new Date(today.getFullYear(),today.getMonth(),1);break;
  case 'last_month':from=new Date(today.getFullYear(),today.getMonth()-1,1);to=new Date(today.getFullYear(),today.getMonth(),0);break;
  case 'maximum':from=new Date(2010,0,1);break;
 }
 return {from:localDate(from),to:localDate(to)};
}

export function normalizeMarketingPeriodKey(value:unknown):MarketingPeriodKey{
 return marketingPeriodOptions.some(option=>option.id===value)?value as MarketingPeriodKey:'this_month';
}
