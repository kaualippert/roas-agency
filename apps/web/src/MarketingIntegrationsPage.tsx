import {useEffect,useMemo,useState} from 'react';
import {BarChart3,Check,CheckCircle2,Clock3,PlugZap,RefreshCw,Settings2,ShieldCheck,Unplug} from 'lucide-react';
import {useStoreData} from './app/useStoreData';
import {Badge,Button,Modal,Toast} from './components/ui';

type Provider='meta'|'google';
type IntegrationStatus='connected'|'disconnected';

interface MarketingIntegration{
 id:string;
 provider:Provider;
 status:IntegrationStatus;
 accountName:string;
 accountId:string;
 email:string;
 autoSync:boolean;
 connectedAt?:string;
 lastSync?:string;
}

const providers:{id:Provider;name:string;shortName:string;description:string;features:string[]}[]=[
 {id:'meta',name:'Meta Ads',shortName:'Meta',description:'Centralize campanhas do Facebook e Instagram Ads.',features:['Campanhas e conjuntos de anúncios','Investimento, alcance e conversões','Contas de anúncios vinculadas']},
 {id:'google',name:'Google Ads',shortName:'Google',description:'Acompanhe mídia de pesquisa, display e YouTube.',features:['Campanhas e grupos de anúncios','Cliques, custo e conversões','Contas de administrador e clientes']},
];

const emptyIntegration=(provider:Provider):MarketingIntegration=>({id:provider,provider,status:'disconnected',accountName:'',accountId:'',email:'',autoSync:true});
const dateTime=(value?:string)=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Ainda não sincronizado';

export default function MarketingIntegrationsPage(){
 const [stored,setStored]=useStoreData<MarketingIntegration[]>('marketing_integrations',[]);
 const [editing,setEditing]=useState<Provider|null>(null),[toast,setToast]=useState('');
 const integrations=useMemo(()=>providers.map(provider=>stored.find(item=>item.provider===provider.id)||emptyIntegration(provider.id)),[stored]);
 const connected=integrations.filter(item=>item.status==='connected');
 useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),2600);return()=>window.clearTimeout(timer)},[toast]);

 const update=(provider:Provider,changes:Partial<MarketingIntegration>)=>{
  const next=providers.map(item=>{const current=stored.find(saved=>saved.provider===item.id)||emptyIntegration(item.id);return item.id===provider?{...current,...changes}:current});
  setStored(next);
 };
 const save=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(!editing)return;
  const form=new FormData(event.currentTarget),now=new Date().toISOString();
  update(editing,{status:'connected',accountName:String(form.get('accountName')),accountId:String(form.get('accountId')),email:String(form.get('email')),autoSync:form.get('autoSync')==='on',connectedAt:integrations.find(item=>item.provider===editing)?.connectedAt||now,lastSync:now});
  const name=providers.find(item=>item.id===editing)?.name;setEditing(null);setToast(`${name} conectado com sucesso.`);
 };
 const disconnect=(provider:Provider)=>{const name=providers.find(item=>item.id===provider)?.name;if(!confirm(`Desconectar ${name}? A conta deixará de sincronizar novos dados.`))return;update(provider,emptyIntegration(provider));setToast(`${name} desconectado.`)};
 const sync=(provider:Provider)=>{update(provider,{lastSync:new Date().toISOString()});setToast('Dados sincronizados com sucesso.')};

 return <main className="marketingIntegrationsPage">
  <section className="integrationHero">
   <div><span className="integrationEyebrow"><PlugZap/> CENTRAL DE INTEGRAÇÕES</span><h2>Conecte seus canais de mídia</h2><p>Reúna dados de campanhas em um só lugar para acompanhar resultados, clientes e investimentos.</p></div>
   <div className="integrationHeroStatus"><span><i className={connected.length?'online':''}/>{connected.length} de {providers.length} conectadas</span><b>{connected.length===providers.length?'Tudo pronto':'Conecte suas contas'}</b></div>
  </section>

  <section className="integrationStats">
   <article className="card"><span className="integrationStatIcon purple"><PlugZap/></span><div><small>Plataformas disponíveis</small><strong>{providers.length}</strong></div></article>
   <article className="card"><span className="integrationStatIcon green"><CheckCircle2/></span><div><small>Contas conectadas</small><strong>{connected.length}</strong></div></article>
   <article className="card"><span className="integrationStatIcon orange"><Clock3/></span><div><small>Aguardando conexão</small><strong>{providers.length-connected.length}</strong></div></article>
   <article className="card"><span className="integrationStatIcon blue"><RefreshCw/></span><div><small>Sincronização automática</small><strong>{connected.filter(item=>item.autoSync).length}</strong></div></article>
  </section>

  <section className="integrationGrid">
   {providers.map(provider=>{const integration=integrations.find(item=>item.provider===provider.id)!;const isConnected=integration.status==='connected';return <article className={`card integrationCard ${isConnected?'isConnected':''}`} key={provider.id}>
    <div className="integrationCardHead"><div className={`providerLogo ${provider.id}`} aria-hidden="true">{provider.id==='meta'?'∞':'G'}</div><div><h3>{provider.name}</h3><p>{provider.description}</p></div><Badge tone={isConnected?'green':'orange'}>{isConnected?'Conectado':'Não conectado'}</Badge></div>
    <div className="integrationFeatures">{provider.features.map(feature=><span key={feature}><Check/>{feature}</span>)}</div>
    {isConnected?<div className="connectedAccount"><div><small>Conta conectada</small><b>{integration.accountName}</b><span>ID {integration.accountId}</span></div><div><small>Última sincronização</small><b>{dateTime(integration.lastSync)}</b><span>{integration.autoSync?'Sincronização automática ativa':'Sincronização manual'}</span></div></div>:<div className="integrationEmpty"><ShieldCheck/><div><b>Conexão segura</b><span>Configure a conta que será usada para importar os dados.</span></div></div>}
    <footer>{isConnected?<><button className="integrationTextButton danger" onClick={()=>disconnect(provider.id)}><Unplug/> Desconectar</button><div><button className="integrationIconButton" title="Configurar integração" onClick={()=>setEditing(provider.id)}><Settings2/></button><Button secondary onClick={()=>sync(provider.id)}><RefreshCw/> Sincronizar agora</Button></div></>:<Button onClick={()=>setEditing(provider.id)}><PlugZap/> Conectar {provider.shortName}</Button>}</footer>
   </article>})}
  </section>

  <section className="card integrationGuide"><div><span><BarChart3/></span><div><h3>Dados de marketing mais próximos da operação</h3><p>Ao conectar uma plataforma, a estrutura fica preparada para associar contas de anúncios aos clientes e alimentar relatórios e dashboards.</p></div></div><ol><li><b>1</b><span><strong>Conecte a conta</strong><small>Informe a identificação da conta de anúncios.</small></span></li><li><b>2</b><span><strong>Associe aos clientes</strong><small>Organize cada conta dentro da agência.</small></span></li><li><b>3</b><span><strong>Acompanhe os dados</strong><small>Sincronize métricas sempre que precisar.</small></span></li></ol></section>

  {editing&&<IntegrationModal provider={editing} integration={integrations.find(item=>item.provider===editing)!} onClose={()=>setEditing(null)} onSubmit={save}/>}<Toast text={toast}/>
 </main>;
}

function IntegrationModal({provider,integration,onClose,onSubmit}:{provider:Provider;integration:MarketingIntegration;onClose:()=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void}){
 const meta=providers.find(item=>item.id===provider)!;
 return <Modal title={`Conectar ${meta.name}`} onClose={onClose}><form className="form integrationForm" onSubmit={onSubmit}><div className="integrationModalIntro full"><div className={`providerLogo ${provider}`}>{provider==='meta'?'∞':'G'}</div><div><b>{meta.name}</b><span>Cadastre a conta de anúncios que será vinculada à agência.</span></div></div><label className="full">Nome da conta<input name="accountName" required placeholder="Ex.: Agência ROAS — Conta principal" defaultValue={integration.accountName}/></label><label>ID da conta de anúncios<input name="accountId" required placeholder={provider==='meta'?'Ex.: act_123456789':'Ex.: 123-456-7890'} defaultValue={integration.accountId}/></label><label>E-mail administrador<input name="email" type="email" required placeholder="contato@agencia.com" defaultValue={integration.email}/></label><label className="integrationSync full"><input name="autoSync" type="checkbox" defaultChecked={integration.autoSync}/><span><b>Sincronização automática</b><small>Manter os dados desta conta atualizados automaticamente.</small></span></label><p className="integrationNotice full"><ShieldCheck/> Seus dados de acesso não são armazenados nesta etapa. A autenticação oficial por OAuth poderá ser ativada quando as credenciais das plataformas forem configuradas no backend.</p><div className="formActions full"><Button secondary onClick={onClose}>Cancelar</Button><Button type="submit"><PlugZap/> Salvar conexão</Button></div></form></Modal>;
}
