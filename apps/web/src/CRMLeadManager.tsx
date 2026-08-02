import {useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,Pencil,Trash2,UserPlus,X} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import {store} from './storage';
import type {AgencyService} from './ServicesManager';
import type {Client,TeamMember} from './types';
import {CRM_LEAD_OPEN_EVENT,crmStages as stages,leadServiceIds,serviceEstimate,type CRMLead as Lead,type CRMStage as Stage} from './crm-leads';

const money=(value:number)=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>new Date().toISOString().slice(0,10);

export default function CRMLeadManager(){
 const location=useLocation(),navigate=useNavigate();
 const [selected,setSelected]=useState<Lead|null>(null),[converting,setConverting]=useState(false);
 const [selectedServiceIds,setSelectedServiceIds]=useState<string[]>([]),[variableEstimate,setVariableEstimate]=useState(0);
 const [services,setServices]=useState<AgencyService[]>(()=>store.get('services',[]));
 const [team,setTeam]=useState<TeamMember[]>(()=>store.get('team',[]));
 const [clients,setClients]=useState<Client[]>(()=>store.get('clients',[]));

 const loadLead=(lead:Lead)=>{
  const catalog=store.get<AgencyService[]>('services',[]),ids=leadServiceIds(lead,catalog),fixed=serviceEstimate(ids,catalog).fixedValue;
  setSelectedServiceIds(ids);
  setVariableEstimate(Math.max(0,Number(lead.value||0)-fixed));
  setSelected(lead);
  setConverting(false);
 };

 useEffect(()=>{
  const update=()=>{
   setServices(store.get('services',[]));
   setTeam(store.get('team',[]));
   setClients(store.get('clients',[]));
   setSelected(current=>current?store.get<Lead[]>('prospects',[]).find(lead=>lead.id===current.id)||null:null);
  };
  window.addEventListener('roas-change',update);
  return()=>window.removeEventListener('roas-change',update);
 },[]);
 useEffect(()=>{
  const open=(event:Event)=>{
   if(location.pathname!=='/crm')return;
   const leadId=(event as CustomEvent<{leadId?:string}>).detail?.leadId;
   const lead=store.get<Lead[]>('prospects',[]).find(item=>item.id===leadId);
   if(lead)loadLead(lead);
  };
  window.addEventListener(CRM_LEAD_OPEN_EVENT,open);
  return()=>window.removeEventListener(CRM_LEAD_OPEN_EVENT,open);
 },[location.pathname]);
 useEffect(()=>{
  if(!selected)return;
  const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape'){if(converting)setConverting(false);else setSelected(null)}};
  window.addEventListener('keydown',keyboard);
  return()=>window.removeEventListener('keydown',keyboard);
 },[selected,converting]);

 if(!selected)return null;
 const close=()=>{setSelected(null);setConverting(false)};
 const converted=Boolean(selected.convertedClientId||clients.some(client=>client.sourceLeadId===selected.id));
 const estimate=serviceEstimate(selectedServiceIds,services),estimatedValue=estimate.fixedValue+(estimate.hasVariable||!selectedServiceIds.length?variableEstimate:0);
 const update=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget),all=store.get<Lead[]>('prospects',[]),now=new Date().toISOString();
  const stage=converted?'Negócio fechado':String(form.get('stage')) as Stage;
  const edited:Lead={...selected,name:String(form.get('name')||'').trim(),contact:String(form.get('contact')||'').trim(),phone:String(form.get('phone')||'').trim(),responsibleId:String(form.get('responsibleId')||''),value:estimatedValue,stage,source:String(form.get('source')||'Outro'),nextAction:converted?'Cliente convertido':String(form.get('nextAction')||'').trim(),serviceIds:selectedServiceIds,services:undefined,updatedAt:now};
  store.set('prospects',all.map(lead=>lead.id===edited.id?edited:lead));
  close();
 };
 const remove=()=>{
  if(converted){alert('Um lead convertido não pode ser excluído, pois está vinculado a um cliente.');return}
  if(!confirm(`Excluir o lead ${selected.name}? Essa ação não pode ser desfeita.`))return;
  store.set('prospects',store.get<Lead[]>('prospects',[]).filter(lead=>lead.id!==selected.id));
  close();
 };
 const convert=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const currentClients=store.get<Client[]>('clients',[]),existing=currentClients.find(client=>client.sourceLeadId===selected.id||client.id===selected.convertedClientId);
  if(existing){alert('Este lead já foi convertido em cliente.');close();navigate(`/clients/${existing.id}`);return}
  const form=new FormData(event.currentTarget),now=new Date().toISOString(),managerId=String(form.get('managerId')||'');
  const paymentDayValue=Number(form.get('paymentDay')||0);
  const client:Client={
   id:crypto.randomUUID(),sourceLeadId:selected.id,companyName:String(form.get('companyName')||'').trim(),contactName:String(form.get('contactName')||'').trim(),email:String(form.get('email')||'').trim(),phone:String(form.get('phone')||'').trim(),instagram:String(form.get('instagram')||'').trim(),segment:String(form.get('segment')||'').trim(),city:String(form.get('city')||'').trim(),cnpj:String(form.get('cnpj')||'').trim(),paymentDay:paymentDayValue>=1&&paymentDayValue<=31?paymentDayValue:undefined,status:'active',managerId,responsibleIds:managerId?[managerId]:[],monthlyRevenue:Math.max(0,Number(form.get('monthlyRevenue')||0)),serviceIds:Array.from(new Set(form.getAll('serviceIds').map(String))),startDate:String(form.get('startDate')||today()),notes:String(form.get('notes')||'').trim(),color:selected.color||'#5b36f2',createdAt:now,updatedAt:now,
  };
  store.set('clients',[client,...currentClients]);
  store.set('prospects',store.get<Lead[]>('prospects',[]).map(lead=>lead.id===selected.id?{...lead,stage:'Negócio fechado',nextAction:'Cliente convertido',convertedClientId:client.id,updatedAt:now}:lead));
  close();
  navigate(`/clients/${client.id}`);
 };

 if(converting)return <ConversionModal lead={selected} services={services} team={team} onClose={()=>setConverting(false)} onSubmit={convert}/>;
 return <div className="overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><div className="modal leadEditModal" role="dialog" aria-modal="true" aria-labelledby="edit-lead-title"><div className="modalHead"><div><small>GERENCIAR LEAD</small><h2 id="edit-lead-title">Editar oportunidade</h2><p>{selected.name} · {money(estimatedValue)}</p></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={close}><X/></button></div>{converted&&<div className="convertedNotice"><CheckCircle2/><div><b>Lead convertido em cliente</b><span>A etapa e o vínculo comercial estão protegidos.</span></div></div>}<form className="form" onSubmit={update}><label>Empresa<input name="name" required defaultValue={selected.name}/></label><label>Contato<input name="contact" required defaultValue={selected.contact}/></label><label>Telefone<input name="phone" type="tel" defaultValue={selected.phone} placeholder="(00) 00000-0000"/></label><label>Responsável pelo lead<select name="responsibleId" defaultValue={selected.responsibleId||''}><option value="">Definir depois</option>{team.filter(member=>member.status==='active'||member.id===selected.responsibleId).map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Etapa<select name="stage" defaultValue={converted?'Negócio fechado':selected.stage} disabled={converted}>{stages.map(stage=><option key={stage}>{stage}</option>)}</select>{converted&&<small>Leads convertidos permanecem em Negócio fechado.</small>}</label><label>Origem<select name="source" defaultValue={selected.source||'Outro'}><option>Instagram</option><option>Site</option><option>Indicação</option><option>Google</option><option>WhatsApp</option><option>Outro</option></select></label><label className="full">Próxima ação<input name="nextAction" defaultValue={converted?'Cliente convertido':selected.nextAction} disabled={converted}/></label><div className="full"><b className="formGroupLabel">Serviços solicitados</b><small className="formHelper">Os serviços mensais atualizam o valor automaticamente.</small><div className="selectionGrid crmServicesSelect">{services.filter(service=>service.active||selectedServiceIds.includes(service.id)).map(service=><label key={service.id}><input type="checkbox" checked={selectedServiceIds.includes(service.id)} onChange={event=>setSelectedServiceIds(current=>event.target.checked?[...current,service.id]:current.filter(id=>id!==service.id))}/><span><b>{service.name}</b><small>{service.pricingType==='variable'||service.price<=0?'Valor a definir':`${money(service.price)}/mês`}</small></span></label>)}</div>{!services.length&&<p className="noServices">Nenhum serviço cadastrado.</p>}</div><div className="leadEstimateBox full"><div><span>Valor automático dos serviços</span><strong>{money(estimate.fixedValue)}</strong></div>{(estimate.hasVariable||!selectedServiceIds.length)&&<label>{selectedServiceIds.length?'Estimativa dos serviços sem valor fixo':'Valor estimado'}<input type="number" min="0" step="0.01" value={variableEstimate||''} onChange={event=>setVariableEstimate(Number(event.target.value)||0)} placeholder="0,00"/></label>}<div className="leadEstimateTotal"><span>Valor estimado total</span><strong>{money(estimatedValue)}</strong></div></div><div className="leadConvertBar full"><div><b>{converted?'Cliente já criado':'O negócio avançou?'}</b><span>{converted?'Abra a central do cliente para continuar o atendimento.':'Converta o lead sem digitar novamente os dados comerciais.'}</span></div><button type="button" className="btn convertLead" disabled={converted} onClick={()=>setConverting(true)}>{converted?<CheckCircle2/>:<UserPlus/>}{converted?'Cliente criado':'Converter em cliente'}{!converted&&<ArrowRight/>}</button></div><div className="leadEditActions full"><button type="button" className="btn deleteLead" disabled={converted} title={converted?'Leads vinculados a clientes não podem ser excluídos.':''} onClick={remove}><Trash2/> Excluir lead</button><span/><button type="button" className="btn secondary" onClick={close}>Cancelar</button><button className="btn"><Pencil/> Salvar alterações</button></div></form></div></div>;
}

function ConversionModal({lead,services,team,onClose,onSubmit}:{lead:Lead;services:AgencyService[];team:TeamMember[];onClose:()=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void}){
 const selectedIds=leadServiceIds(lead,services),recurringValue=serviceEstimate(selectedIds,services).fixedValue;
 return <div className="overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><div className="modal conversionModal" role="dialog" aria-modal="true" aria-labelledby="convert-lead-title"><div className="modalHead"><div><small>CRM → CLIENTE</small><h2 id="convert-lead-title">Converter lead em cliente</h2><p>Revise as informações antes de criar o cadastro.</p></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={onClose}><X/></button></div><div className="conversionSummary"><span style={{background:lead.color}}>{lead.name.split(' ').map(part=>part[0]).join('').slice(0,2).toUpperCase()}</span><div><b>{lead.name}</b><small>{lead.contact} · {lead.source}</small></div><strong>{money(lead.value)}</strong></div><form className="form conversionForm" onSubmit={onSubmit}><label>Empresa<input name="companyName" required autoFocus defaultValue={lead.name}/></label><label>Contato principal<input name="contactName" required defaultValue={lead.contact}/></label><label>E-mail<input name="email" type="email" required placeholder="contato@empresa.com.br"/></label><label>Telefone<input name="phone" required defaultValue={lead.phone} placeholder="(00) 00000-0000"/></label><label>CNPJ<input name="cnpj" inputMode="numeric" placeholder="00.000.000/0001-00"/></label><label>Dia do pagamento<input name="paymentDay" type="number" min="1" max="31" placeholder="10"/></label><label>Instagram<input name="instagram" placeholder="@empresa"/></label><label>Segmento<input name="segment" placeholder="Ex.: Saúde e estética"/></label><label>Cidade<input name="city" placeholder="Cidade / Estado"/></label><label>Início do contrato<input name="startDate" type="date" required defaultValue={today()}/></label><label>Receita recorrente mensal<input name="monthlyRevenue" type="number" min="0" step="0.01" required defaultValue={recurringValue}/><small>Somente os serviços mensais entram automaticamente. Valores variáveis não viram recorrência.</small></label><label>Gestor responsável<select name="managerId" defaultValue={lead.responsibleId||''}><option value="">Definir depois</option>{team.filter(member=>member.status==='active'||member.id===lead.responsibleId).map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label><div className="full clientServicesField"><b>Serviços contratados</b><small>Os serviços solicitados pelo lead já estão selecionados.</small><div className="clientServicesGrid">{services.filter(service=>service.active||selectedIds.includes(service.id)).map(service=><label key={service.id}><input name="serviceIds" type="checkbox" value={service.id} defaultChecked={selectedIds.includes(service.id)}/><span><b>{service.name}</b><small>{service.pricingType==='variable'||service.price<=0?'Valor variável':`${money(service.price)}/mês`}</small></span></label>)}</div></div><label className="full">Observações<textarea name="notes" defaultValue={`Convertido do CRM. Origem do lead: ${lead.source}.`}/></label><div className="conversionInfo full"><CheckCircle2/><span>Ao concluir, o lead será movido para <b>Negócio fechado</b> e a central do novo cliente será aberta.</span></div><div className="formActions full"><button type="button" className="btn secondary" onClick={onClose}>Voltar</button><button className="btn"><UserPlus/> Criar cliente</button></div></form></div></div>;
}
