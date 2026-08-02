import {useEffect,useMemo,useState} from 'react';
import {Cell,Pie,PieChart,ResponsiveContainer,Tooltip} from 'recharts';
import type {AgencyService} from './ServicesManager';
import {linkedServices,type ServiceLinkedRecord} from './service-links';
import {store} from './storage';

type Lead=ServiceLinkedRecord;
const colors=['#5b36f2','#287cf0','#16a269','#e99a18','#e8547c','#7c8aa2','#14b8a6','#f97316'];

export default function CRMServicesAnalytics({leads:providedLeads,services:providedServices}:{leads?:Lead[];services?:AgencyService[]}={}){
 const [storedLeads,setLeads]=useState<Lead[]>(()=>store.get('prospects',[])),[storedServices,setServices]=useState<AgencyService[]>(()=>store.get('services',[]));
 useEffect(()=>{const update=()=>{setLeads(store.get('prospects',[]));setServices(store.get('services',[]))};window.addEventListener('roas-change',update);return()=>window.removeEventListener('roas-change',update)},[]);
 const leads=providedLeads||storedLeads,services=providedServices||storedServices;
 const data=useMemo(()=>{const count=new Map<string,number>();leads.flatMap(lead=>linkedServices(lead,services).map(service=>service.name)).forEach(service=>count.set(service,(count.get(service)||0)+1));return Array.from(count,([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)},[leads,services]);
 const chartData=data.length?data:[{name:'Sem serviços registrados',value:1}];
 return <section className="card crmServicesAnalytics"><div className="servicesChartCopy"><small>INTERESSE COMERCIAL</small><h3>Serviços mais solicitados</h3><p>Distribuição dos serviços de interesse no recorte atual do pipeline.</p><div className="servicesChartLegend">{data.map((item,index)=><span key={item.name}><i style={{background:colors[index%colors.length]}}/><b>{item.name}</b><em>{item.value} {item.value===1?'lead':'leads'}</em></span>)}{!data.length&&<div className="crmServicesEmpty">Nenhum serviço vinculado aos leads exibidos.</div>}</div></div><div className="servicesPie"><ResponsiveContainer width="100%" height={270}><PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={3} stroke="none">{chartData.map((item,index)=><Cell key={item.name} fill={data.length?colors[index%colors.length]:'#d9dee7'}/>)}</Pie><Tooltip formatter={(value:any)=>[`${value} lead(s)`,'Solicitações']}/></PieChart></ResponsiveContainer><div className="pieCenter"><strong>{data.reduce((sum,item)=>sum+item.value,0)}</strong><span>solicitações</span></div></div></section>
}
