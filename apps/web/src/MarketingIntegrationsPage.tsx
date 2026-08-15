import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,Building2,Check,CheckCircle2,KeyRound,LoaderCircle,PlugZap,RefreshCw,Settings2,ShieldCheck,Unplug,Users} from 'lucide-react';
import {useStoreData} from './app/useStoreData';
import {Badge,Button,Empty,Modal,Toast} from './components/ui';
import {findMarketingResourceConflict,markMarketingIntegrationSynced,marketingProviders,migratableLegacyMarketingIntegrations,migrateLegacyMarketingIntegration,normalizeClientMarketingIntegrations,providerById,removeClientMarketingIntegration,upsertClientMarketingIntegration,type ClientMarketingIntegration,type LegacyMarketingIntegration,type MarketingProvider} from './marketing-integrations';
import type {Client} from './types';
import {beginOAuth,loadMarketingResources,loadOAuthOverview,oauthProviderFor,type AgencyOAuthConnection,type AgencyOAuthProvider,type MarketingResource,type OAuthProviderConfiguration} from './marketing-oauth-client';

type Editing={provider:MarketingProvider;integration?:ClientMarketingIntegration};

export default function MarketingIntegrationsPage(){
 const [clients]=useStoreData<Client[]>('clients',[]);
 const [storedIntegrations,setIntegrations]=useStoreData<ClientMarketingIntegration[]>('client_marketing_integrations',[]);
 const [legacy,setLegacy]=useStoreData<LegacyMarketingIntegration[]>('marketing_integrations',[]);
 const activeClients=useMemo(()=>clients.filter(client=>client.status==='active'),[clients]);
 const integrations=useMemo(()=>normalizeClientMarketingIntegrations(storedIntegrations),[storedIntegrations]);
 const legacyCandidates=useMemo(()=>migratableLegacyMarketingIntegrations(legacy),[legacy]);
 const [clientId,setClientId]=useState(()=>activeClients[0]?.id||'');
 const [editing,setEditing]=useState<Editing|null>(null),[migrating,setMigrating]=useState<LegacyMarketingIntegration|null>(null),[toast,setToast]=useState('');
 const [connections,setConnections]=useState<AgencyOAuthConnection[]>([]),[oauthConfig,setOauthConfig]=useState<Record<AgencyOAuthProvider,OAuthProviderConfiguration>|null>(null),[oauthLoading,setOauthLoading]=useState(true);
 useEffect(()=>{if(!activeClients.some(client=>client.id===clientId))setClientId(activeClients[0]?.id||'')},[activeClients,clientId]);
 useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),2600);return()=>window.clearTimeout(timer)},[toast]);
 useEffect(()=>{loadOAuthOverview().then(result=>{setConnections(result.connections);setOauthConfig(result.providers)}).catch(error=>setToast(error instanceof Error?error.message:'Não foi possível carregar as conexões OAuth.')).finally(()=>setOauthLoading(false));const params=new URLSearchParams(location.search);if(params.get('oauth')){setToast(params.get('oauth')==='success'?'Conta conectada com sucesso.':params.get('message')||'Não foi possível conectar a conta.');history.replaceState({},'',location.pathname)}},[]);
 const selectedClient=activeClients.find(client=>client.id===clientId);
 const selectedIntegrations=integrations.filter(item=>item.clientId===clientId);
 const connectedBrands=new Set(integrations.filter(item=>item.status==='connected').map(item=>item.clientId)).size;
 const autoSync=integrations.filter(item=>item.status==='connected'&&item.autoSync).length;

 const save=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(!editing||!clientId)return;
  const form=new FormData(event.currentTarget),now=new Date().toISOString(),current=editing.integration;
  const integration:ClientMarketingIntegration={
   schemaVersion:1,id:current?.id||crypto.randomUUID(),clientId,provider:editing.provider,agencyConnectionId:String(form.get('agencyConnectionId')),status:'connected',
   primaryName:String(form.get('primaryName')).trim(),primaryId:String(form.get('primaryId')).trim(),
   resourceName:String(form.get('resourceName')).trim(),resourceId:String(form.get('resourceId')).trim(),
   accessEmail:String(form.get('accessEmail')).trim(),autoSync:form.get('autoSync')==='on',
   connectedAt:current?.connectedAt||now,lastSync:current?.lastSync||now,createdAt:current?.createdAt||now,updatedAt:now,
  };
  const conflict=findMarketingResourceConflict(integrations,integration);
  if(conflict){const client=clients.find(item=>item.id===conflict.clientId);setToast(`Esta conta já está vinculada a ${client?.companyName||'outra marca'}.`);return}
  setIntegrations(upsertClientMarketingIntegration(integrations,integration));
  setEditing(null);setToast(`${providerById(integration.provider).name} vinculada a ${selectedClient?.companyName}.`);
 };
 const disconnect=(integration:ClientMarketingIntegration)=>{
  if(!confirm(`Remover ${providerById(integration.provider).name} de ${selectedClient?.companyName}?`))return;
  setIntegrations(removeClientMarketingIntegration(integrations,integration.id));setToast('Integração removida da marca.');
 };
 const sync=(integration:ClientMarketingIntegration)=>{setIntegrations(markMarketingIntegrationSynced(integrations,integration.id));setToast('Sincronização registrada com sucesso.')};
 const migrate=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(!migrating)return;
  const form=new FormData(event.currentTarget),targetClientId=String(form.get('clientId'));
  const integration=migrateLegacyMarketingIntegration(migrating,{clientId:targetClientId,primaryName:String(form.get('primaryName')),primaryId:String(form.get('primaryId')),resourceName:String(form.get('resourceName')),resourceId:String(form.get('resourceId'))});
  const targetClient=activeClients.find(client=>client.id===targetClientId);
  if(integrations.some(item=>item.clientId===targetClientId&&item.provider===integration.provider)){setToast(`${targetClient?.companyName||'Esta marca'} já possui ${providerById(integration.provider).name}.`);return}
  const conflict=findMarketingResourceConflict(integrations,integration);
  if(conflict){const client=clients.find(item=>item.id===conflict.clientId);setToast(`Esta conta já está vinculada a ${client?.companyName||'outra marca'}.`);return}
  setIntegrations(upsertClientMarketingIntegration(integrations,integration));
  const remaining=legacy.filter(item=>item.id!==migrating.id);setLegacy(remaining);setClientId(targetClientId);
  const next=migratableLegacyMarketingIntegrations(remaining)[0]||null;setMigrating(next);
  setToast(`${providerById(integration.provider).name} migrada para ${targetClient?.companyName}.`);
 };
 const connect=async(provider:AgencyOAuthProvider)=>{try{await beginOAuth(provider)}catch(error){setToast(error instanceof Error?error.message:'Não foi possível iniciar a conexão.')}};

 return <main className="marketingIntegrationsPage brandIntegrationsPage">
  <section className="card agencyConnections">
   <div className="agencyConnectionsHead"><div><small>CONEXÕES SEGURAS DA AGÊNCIA</small><h3>Meta e Google</h3><p>Conecte cada ecossistema uma vez. Depois selecione as contas reais de cada marca.</p></div><KeyRound/></div>
   <div className="agencyConnectionGrid">{(['meta','google'] as AgencyOAuthProvider[]).map(provider=>{const linked=connections.filter(item=>item.provider===provider),configured=oauthConfig?.[provider];return <article key={provider}><div className={`providerLogo ${provider==='meta'?'meta_ads':'google_ads'}`}>{provider==='meta'?'M':'G'}</div><div><b>{provider==='meta'?'Meta Business':'Google'}</b>{oauthLoading?<span><LoaderCircle className="spin"/> Carregando</span>:linked.length?<span className="connectedLabel"><Check/> {linked.map(item=>item.accountEmail||item.accountName).join(', ')}</span>:<span>{configured?.configured?'Nenhuma conta conectada':`Configuração pendente${configured?.missing?.length?`: ${configured.missing.join(', ')}`:''}`}</span>}</div><Button secondary disabled={oauthLoading||configured?.configured===false} onClick={()=>connect(provider)}>{linked.length?'Reconectar':'Conectar'}</Button></article>})}</div>
  </section>
  <section className="integrationHero brandIntegrationHero">
   <div><span className="integrationEyebrow"><PlugZap/> INTEGRAÇÕES DE MARCA</span><h2>Contas certas para cada cliente</h2><p>Escolha uma marca e vincule as contas de mídia, Analytics e presença local que pertencem a ela.</p></div>
   <label className="brandClientSelector"><span>Marca selecionada</span><select value={clientId} onChange={event=>setClientId(event.target.value)}><option value="">Selecione um cliente</option>{activeClients.map(client=><option key={client.id} value={client.id}>{client.companyName}</option>)}</select></label>
  </section>

  <section className="integrationStats">
   <article className="card"><span className="integrationStatIcon purple"><Users/></span><div><small>Marcas ativas</small><strong>{activeClients.length}</strong></div></article>
   <article className="card"><span className="integrationStatIcon green"><CheckCircle2/></span><div><small>Marcas integradas</small><strong>{connectedBrands}</strong></div></article>
   <article className="card"><span className="integrationStatIcon blue"><PlugZap/></span><div><small>Canais vinculados</small><strong>{integrations.length}</strong></div></article>
   <article className="card"><span className="integrationStatIcon orange"><RefreshCw/></span><div><small>Sincronização automática</small><strong>{autoSync}</strong></div></article>
  </section>

  {legacyCandidates.length>0&&<div className="legacyIntegrationNotice"><AlertTriangle/><div><b>{legacyCandidates.length} {legacyCandidates.length===1?'cadastro manual pendente':'cadastros manuais pendentes'}</b><span>Reaproveite as contas existentes e escolha a marca correta para concluir a migração.</span></div><Button secondary onClick={()=>setMigrating(legacyCandidates[0])}>Migrar cadastros</Button></div>}

  {selectedClient?<>
   <div className="brandSectionTitle"><div><small>CONFIGURAR MARCA</small><h3>{selectedClient.companyName}</h3><p>{selectedIntegrations.length} de {marketingProviders.length} canais configurados</p></div><span className="brandInitial" style={{background:selectedClient.color}}>{initials(selectedClient.companyName)}</span></div>
   <section className="integrationGrid brandIntegrationGrid">
    {marketingProviders.map(provider=>{const integration=selectedIntegrations.find(item=>item.provider===provider.id),connected=integration?.status==='connected';return <article className={`card integrationCard ${connected?'isConnected':''}`} key={provider.id}>
     <div className="integrationCardHead"><div className={`providerLogo ${provider.id}`}>{provider.mark}</div><div><h3>{provider.name}</h3><p>{provider.description}</p></div><Badge tone={connected?'green':'orange'}>{connected?'Vinculado':'Não configurado'}</Badge></div>
     {integration?<><div className="brandAccountSummary"><div><small>{provider.primaryLabel}</small><b>{integration.primaryName}</b><span>{integration.primaryId}</span></div><div><small>{provider.resourceLabel}</small><b>{integration.resourceName}</b><span>{integration.resourceId}</span></div></div><div className="brandSyncStatus"><Check/><span>Última sincronização: {dateTime(integration.lastSync)}</span></div></>:<div className="integrationEmpty"><ShieldCheck/><div><b>Pronta para configurar</b><span>Selecione a estrutura e a conta específicas desta marca.</span></div></div>}
     <footer>{integration?<><button className="integrationTextButton danger" onClick={()=>disconnect(integration)}><Unplug/> Remover vínculo</button><div><button className="integrationIconButton" title="Editar integração" onClick={()=>setEditing({provider:provider.id,integration})}><Settings2/></button><Button secondary onClick={()=>sync(integration)}><RefreshCw/> Sincronizar</Button></div></>:<Button onClick={()=>setEditing({provider:provider.id})}><PlugZap/> Configurar {provider.short}</Button>}</footer>
    </article>})}
   </section>
  </>:<section className="card brandNoClient"><Empty label="cliente ativo"/></section>}

  <section className="card brandCoverage"><div className="brandCoverageHead"><div><h3>Cobertura das marcas</h3><p>Visualize rapidamente quais canais estão configurados em cada cliente.</p></div><Building2/></div><div className="brandCoverageList">{activeClients.map(client=><article key={client.id} onClick={()=>setClientId(client.id)}><div><span className="avatar" style={{background:client.color}}>{initials(client.companyName)}</span><b>{client.companyName}</b></div><div>{marketingProviders.map(provider=>{const active=integrations.some(item=>item.clientId===client.id&&item.provider===provider.id&&item.status==='connected');return <span key={provider.id} className={active?'active':''} title={provider.name}>{provider.mark}</span>})}</div><button>Configurar</button></article>)}</div></section>

  {editing&&<RealBrandIntegrationModal editing={editing} client={selectedClient} connections={connections} onConnect={connect} onClose={()=>setEditing(null)} onSubmit={save}/>} {migrating&&<LegacyMigrationModal legacy={migrating} clients={activeClients} pending={legacyCandidates.length} onClose={()=>setMigrating(null)} onSubmit={migrate}/>}<Toast text={toast}/>
 </main>;
}

function RealBrandIntegrationModal({editing,client,connections,onConnect,onClose,onSubmit}:{editing:Editing;client?:Client;connections:AgencyOAuthConnection[];onConnect:(provider:AgencyOAuthProvider)=>void;onClose:()=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void}){
 const provider=providerById(editing.provider),integration=editing.integration,oauthProvider=oauthProviderFor(editing.provider),available=connections.filter(item=>item.provider===oauthProvider);
 const [connectionId,setConnectionId]=useState(integration?.agencyConnectionId||available[0]?.id||''),[primaryId,setPrimaryId]=useState(integration?.primaryId||''),[resourceId,setResourceId]=useState(integration?.resourceId||''),[primaries,setPrimaries]=useState<MarketingResource[]>([]),[resources,setResources]=useState<MarketingResource[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!connectionId)return;setLoading(true);setError('');loadMarketingResources(editing.provider,connectionId).then(result=>setPrimaries(result.primaries)).catch(error=>setError(error instanceof Error?error.message:'Não foi possível listar as estruturas.')).finally(()=>setLoading(false))},[connectionId,editing.provider]);
 useEffect(()=>{if(!connectionId||!primaryId)return;setLoading(true);setError('');loadMarketingResources(editing.provider,connectionId,primaryId).then(result=>setResources(result.resources)).catch(error=>setError(error instanceof Error?error.message:'Não foi possível listar as contas.')).finally(()=>setLoading(false))},[connectionId,editing.provider,primaryId]);
 const selectedPrimary=primaries.find(item=>item.id===primaryId),selectedResource=resources.find(item=>item.id===resourceId),connection=available.find(item=>item.id===connectionId);
 return <Modal title={`Configurar ${provider.name}`} onClose={onClose}><form className="form integrationForm" onSubmit={onSubmit}>
  <div className="integrationModalIntro full"><div className={`providerLogo ${provider.id}`}>{provider.mark}</div><div><b>{client?.companyName}</b><span>{provider.name} será vinculada somente a esta marca.</span></div></div>
  {!available.length?<div className="oauthRequired full"><KeyRound/><div><b>Conecte a agência primeiro</b><span>Autorize uma conta {oauthProvider==='meta'?'Meta Business':'Google'} para carregar estruturas e contas reais.</span></div><Button type="button" onClick={()=>onConnect(oauthProvider)}>Conectar {oauthProvider==='meta'?'Meta':'Google'}</Button></div>:<>
   <label className="full">Conexão da agência<select name="agencyConnectionId" required value={connectionId} onChange={event=>{setConnectionId(event.target.value);setPrimaryId('');setResourceId('');setResources([])}}><option value="">Selecione a conexão</option>{available.map(item=><option key={item.id} value={item.id}>{item.accountName} {item.accountEmail&&`· ${item.accountEmail}`}</option>)}</select></label>
   <label className="full">{provider.primaryLabel}<select required value={primaryId} onChange={event=>{setPrimaryId(event.target.value);setResourceId('');setResources([])}}><option value="">Selecione uma estrutura real</option>{integration&&!primaries.some(item=>item.id===integration.primaryId)&&<option value={integration.primaryId}>{integration.primaryName}</option>}{primaries.map(item=><option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
   <label className="full">{provider.resourceLabel}<select required value={resourceId} onChange={event=>setResourceId(event.target.value)}><option value="">Selecione uma conta ou recurso real</option>{integration&&!resources.some(item=>item.id===integration.resourceId)&&<option value={integration.resourceId}>{integration.resourceName}</option>}{resources.map(item=><option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
   <input type="hidden" name="primaryId" value={primaryId}/><input type="hidden" name="primaryName" value={selectedPrimary?.name||integration?.primaryName||''}/><input type="hidden" name="resourceId" value={resourceId}/><input type="hidden" name="resourceName" value={selectedResource?.name||integration?.resourceName||''}/><input type="hidden" name="accessEmail" value={connection?.accountEmail||''}/>
  </>}
  {loading&&<p className="integrationLoading full"><LoaderCircle className="spin"/> Consultando a plataforma...</p>}{error&&<p className="integrationError full"><AlertTriangle/> {error}</p>}
  <label className="integrationSync full"><input name="autoSync" type="checkbox" defaultChecked={integration?.autoSync??true}/><span><b>Sincronização automática</b><small>Manter os dados desta marca atualizados.</small></span></label>
  <p className="integrationNotice full"><ShieldCheck/> Tokens e credenciais ficam criptografados no servidor e nunca são armazenados no cadastro do cliente.</p>
  <div className="formActions full"><Button secondary type="button" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={!available.length||loading}><PlugZap/> Salvar vínculo</Button></div>
 </form></Modal>;
}

function LegacyMigrationModal({legacy,clients,pending,onClose,onSubmit}:{legacy:LegacyMarketingIntegration;clients:Client[];pending:number;onClose:()=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void}){
 const provider=providerById(legacy.provider==='meta'?'meta_ads':'google_ads');
 return <Modal title={`Migrar ${provider.name}`} onClose={onClose}><form className="form integrationForm legacyMigrationForm" onSubmit={onSubmit}>
  <div className="integrationModalIntro full"><div className={`providerLogo ${provider.id}`}>{provider.mark}</div><div><b>{legacy.accountName||'Conta sem nome'}</b><span>{pending} {pending===1?'cadastro pendente':'cadastros pendentes'} · os dados existentes serão preservados.</span></div></div>
  <label className="full">Vincular à marca<select name="clientId" required defaultValue={clients[0]?.id||''}><option value="">Selecione um cliente</option>{clients.map(client=><option key={client.id} value={client.id}>{client.companyName}</option>)}</select></label>
  <label>{provider.primaryLabel}<input name="primaryName" required placeholder={provider.primaryPlaceholder}/></label>
  <label>ID da estrutura<input name="primaryId" required placeholder="Identificador da BM ou conta administradora"/></label>
  <label>{provider.resourceLabel}<input name="resourceName" required defaultValue={legacy.accountName}/></label>
  <label>ID da conta<input name="resourceId" required defaultValue={legacy.accountId}/></label>
  <div className="legacyDataPreview full"><span><b>E-mail preservado</b>{legacy.email||'Não informado'}</span><span><b>Sincronização</b>{legacy.autoSync===false?'Manual':'Automática'}</span></div>
  <p className="integrationNotice full"><ShieldCheck/> O cadastro antigo será removido somente depois que o novo vínculo por cliente for salvo.</p>
  <div className="formActions full"><Button secondary onClick={onClose}>Migrar depois</Button><Button type="submit"><RefreshCw/> Migrar vínculo</Button></div>
 </form></Modal>;
}

const initials=(name:string)=>name.split(' ').map(part=>part[0]).join('').slice(0,2).toUpperCase();
const dateTime=(value?:string)=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Ainda não sincronizado';
