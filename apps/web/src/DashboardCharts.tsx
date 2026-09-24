import {Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,Line,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';

type RevenueDatum={label:string;previsto:number;recebido:number};
type FunnelDatum={stage:string;total:number;color:string};
type ProjectDatum={name:string;progresso:number};
const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export function DashboardRevenueChart({data}:{data:RevenueDatum[]}){
 return <ResponsiveContainer width="100%" height={270}><AreaChart data={data}><defs><linearGradient id="dashboardRevenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6541ee" stopOpacity={.24}/><stop offset="1" stopColor="#6541ee" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis tickFormatter={value=>`${Math.round(Number(value)/1000)}k`}/><Tooltip formatter={(value:any)=>money(Number(value))}/><Area type="monotone" dataKey="previsto" stroke="#6541ee" fill="url(#dashboardRevenueGradient)" strokeWidth={2}/><Line type="monotone" dataKey="recebido" stroke="#18a267" strokeWidth={3}/></AreaChart></ResponsiveContainer>;
}

export function DashboardFunnelChart({data}:{data:FunnelDatum[]}){
 return <ResponsiveContainer width="100%" height={245}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="stage" tick={{fontSize:9}}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="total" radius={[5,5,0,0]}>{data.map(item=><Cell key={item.stage} fill={item.color}/>)}</Bar></BarChart></ResponsiveContainer>;
}

export function DashboardProjectsChart({data}:{data:ProjectDatum[]}){
 return <ResponsiveContainer width="100%" height={245}><BarChart data={data} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" domain={[0,100]} tickFormatter={value=>`${value}%`}/><YAxis type="category" dataKey="name" width={95} tick={{fontSize:9}}/><Tooltip formatter={(value:any)=>`${value}%`}/><Bar dataKey="progresso" fill="#3b82f6" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer>;
}

type ChartProps={kind:'revenue'|'funnel'|'projects';data:RevenueDatum[]|FunnelDatum[]|ProjectDatum[]};
export default function DashboardChartRenderer({kind,data}:ChartProps){
 if(kind==='revenue')return <DashboardRevenueChart data={data as RevenueDatum[]}/>;
 if(kind==='funnel')return <DashboardFunnelChart data={data as FunnelDatum[]}/>;
 return <DashboardProjectsChart data={data as ProjectDatum[]}/>;
}
