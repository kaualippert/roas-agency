import {useEffect,useRef,useState} from 'react';
import {Layers3,RefreshCw,X} from 'lucide-react';
import {Link} from 'react-router-dom';
import type {MarketingRange} from './marketing-comparison';
import type {ClientMarketingIntegration} from './marketing-integrations';
import {apiRequest} from './storage';
import './meta-breakdown.css';

const dimensions=[{id:'age',label:'Idade'},{id:'gender',label:'Gênero'},{id:'region',label:'Região'},{id:'placement',label:'Posicionamento'}] as const;
const actions=[{id:'leads',label:'Leads'},{id:'purchases',label:'Compras'},{id:'conversations',label:'Conversas iniciadas'}] as const;
type Dimension=typeof dimensions[number]['id'];
type Action=typeof actions[number]['id'];
type Row={id:string;values:string[];currency:string|null;impressions:number|null;reach:number|null;clicks:number|null;spend:number|null}&Record<Action,number|null>;
type BreakdownResult={integrationId:string;dimension:Dimension;period:MarketingRange;rows:Row[];truncated:boolean};
const labels:Record<string,string>={unknown:'Não informado',male:'Masculino',female:'Feminino',facebook:'Facebook',instagram:'Instagram',messenger:'Messenger',audience_network:'Audience Network',threads:'Threads',feed:'Feed',story:'Stories',reels:'Reels',facebook_reels:'Reels',instagram_reels:'Reels',right_hand_column:'Coluna direita',marketplace:'Marketplace',explore:'Explorar',search:'Pesquisa'};
const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
const format=(value:number|null)=>value===null?'—':number.format(value);
const date=(value:string)=>value.split('-').reverse().join('/');
const money=(value:number|null,currency:string|null)=>value===null?'—':currency?value.toLocaleString('pt-BR',{style:'currency',currency}):number.format(value);

export default function MetaBreakdownDialog({account,clientName,range,onClose}:{account?:ClientMarketingIntegration;clientName?:string;range:MarketingRange;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [dimension,setDimension]=useState<Dimension>('age'),[action,setAction]=useState<Action>('leads'),[attempt,setAttempt]=useState(0);
 const [request,setRequest]=useState<{key:string;result?:BreakdownResult;error?:string}>();
 const integrationId=account?.id,clientId=account?.clientId,{from,to}=range;
 const key=JSON.stringify([integrationId,clientId,dimension,from,to,attempt]);
 useEffect(()=>{
  const element=dialog.current;
  element?.showModal();
  return()=>element?.close();
 },[]);
 useEffect(()=>{
  if(!integrationId||!clientId)return;
  const controller=new AbortController();
  async function load(){
   try{
    const result=await apiRequest('/marketing/breakdowns/meta_ads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({integrationId,clientId,dimension,from,to}),signal:controller.signal}) as BreakdownResult;
    if(result.integrationId!==integrationId||result.dimension!==dimension||result.period?.from!==from||result.period?.to!==to||!Array.isArray(result.rows))throw new Error('A resposta não corresponde ao recorte selecionado.');
    if(!controller.signal.aborted)setRequest({key,result});
   }catch(error){
    if(!controller.signal.aborted)setRequest({key,error:error instanceof Error?error.message:'Não foi possível consultar o Meta Ads.'});
   }
  }
  void load();
  return()=>controller.abort();
 },[integrationId,clientId,dimension,from,to,key]);
 const state=request?.key===key?request:null;
 const actionLabel=actions.find(option=>option.id===action)!.label;
 const dimensionLabel=dimensions.find(option=>option.id===dimension)!.label;
 const dismiss=()=>{dialog.current?.close();onClose()};
 return <dialog className="metaBreakdownDialog" ref={dialog} aria-labelledby="meta-breakdown-title" onCancel={event=>{event.preventDefault();dismiss()}}>
  <div className="metaBreakdownHeading">
   <div><span>MARKETING · META ADS</span><h2 id="meta-breakdown-title">Detalhamento Meta Ads</h2><p>{clientName||'Cliente'}{account?` · ${account.resourceName||account.resourceId}`:''} · {date(from)} a {date(to)}</p></div>
   <button type="button" className="iconBtn" aria-label="Fechar detalhamento" onClick={dismiss}><X aria-hidden="true"/></button>
  </div>
  {!account?<div className="metaBreakdownState"><p>Vincule uma conta Meta Ads por OAuth para consultar os recortes deste cliente.</p><Link className="btn" to="/marketing/integrations">Abrir integrações</Link></div>:<>
   <div className="metaBreakdownControls">
    <div className="metaBreakdownTabs" role="group" aria-label="Recorte do Meta Ads">{dimensions.map(option=><button key={option.id} type="button" aria-pressed={dimension===option.id} onClick={()=>setDimension(option.id)}>{option.label}</button>)}</div>
    <label>Ação de resultado <select value={action} onChange={event=>setAction(event.target.value as Action)}>{actions.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
   </div>
   {!state?<div className="metaBreakdownState" role="status">Consultando {dimensionLabel.toLocaleLowerCase('pt-BR')} no Meta Ads…</div>:state.error?<div className="metaBreakdownState"><p role="alert">{state.error}</p><button type="button" className="btn secondary" onClick={()=>setAttempt(value=>value+1)}><RefreshCw aria-hidden="true"/> Tentar novamente</button></div>:state.result?.rows.length?<div className="metaBreakdownScroll" role="region" tabIndex={0} aria-label={`Métricas por ${dimensionLabel.toLocaleLowerCase('pt-BR')}`}>
    <table><thead><tr><th scope="col">{dimensionLabel}</th><th scope="col">Investimento</th><th scope="col">Impressões</th><th scope="col">Alcance</th><th scope="col">Cliques</th><th scope="col">{actionLabel}</th><th scope="col">Custo por ação</th></tr></thead>
     <tbody>{state.result.rows.map(row=>{
      const count=row[action],cost=row.spend!==null&&count!==null&&count>0?row.spend/count:null;
      return <tr key={row.id}>
       <th scope="row">{row.values.map(value=>Object.hasOwn(labels,value)?labels[value]:value.replaceAll('_',' ')).join(' · ')}</th>
       <td>{money(row.spend,row.currency)}</td><td>{format(row.impressions)}</td><td>{format(row.reach)}</td><td>{format(row.clicks)}</td><td>{format(count)}</td><td>{money(cost,row.currency)}</td>
      </tr>;
     })}</tbody>
    </table>
   </div>:<div className="metaBreakdownState" role="status">A Meta não retornou dados para esse recorte no período.</div>}
   {state?.result?.truncated&&<p className="metaBreakdownNote" role="status">A consulta atingiu o limite de linhas. Use um período menor para refinar o recorte.</p>}
   <p className="metaBreakdownNote">“—” indica dado indisponível. O alcance pode se repetir entre linhas, por isso não é somado.</p>
  </>}
 </dialog>;
}
