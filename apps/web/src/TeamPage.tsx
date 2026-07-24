import {useEffect,useMemo,useState} from 'react';
import {BriefcaseBusiness,CheckCircle2,Clipboard,Clock3,Eye,Mail,Pencil,Plus,RotateCw,Search,ShieldCheck,UserMinus,UsersRound,X} from 'lucide-react';
import {createInvitation,listInvitations,resendInvitation,revokeInvitation,type InvitationInput} from './access-api';
import {store} from './storage';
import type {AccessArea,Client,TeamInvitation,TeamMember} from './types';

const departments=['Todos','Gestão','Marketing','Criação','Operações','Financeiro'];
const roles=['Administrador','Gestor de tráfego','Social Media','Designer','Copywriter','Desenvolvedor','Financeiro','Atendimento'];
const accessOptions:{id:AccessArea;label:string;description:string}[]=[
 {id:'general',label:'Geral',description:'Clientes, onboarding, projetos, tarefas e CRM'},
 {id:'marketing',label:'Marketing',description:'Integrações, anúncios, relatórios e criativos'},
 {id:'finance',label:'Financeiro',description:'Visão financeira, faturamento e pagamentos'},
 {id:'settings',label:'Configurações',description:'Equipe e configurações da agência'},
];
const allAreas=accessOptions.map(option=>option.id);
const memberRoles=(member?:TeamMember|null)=>member?.roles?.length?member.roles:member?.role?[member.role]:[];
const memberClients=(member?:TeamMember|null)=>member?.clientIds||[];
const memberAreas=(member?:TeamMember|null)=>member?.accessAreas?.length?member.accessAreas:member?allAreas:[];
const isAdministrator=(member:TeamMember)=>memberRoles(member).some(role=>/administrador|proprietário/i.test(role));
const statusLabels={pending:'Pendente',accepted:'Aceito',expired:'Expirado',revoked:'Cancelado'} as const;

function Avatar({name,color='#5b36f2'}:{name:string;color?:string}){return <span className="teamAvatar" style={{background:color}}>{name.split(' ').slice(0,2).map(part=>part[0]).join('')}</span>}

export default function TeamPage(){
 const [members,setMembers]=useState<TeamMember[]>(()=>store.get('team',[]));
 const [clients,setClients]=useState<Client[]>(()=>store.get('clients',[]));
 const [invitations,setInvitations]=useState<TeamInvitation[]>([]);
 const [tab,setTab]=useState<'members'|'invitations'>('members');
 const [query,setQuery]=useState(''),[department,setDepartment]=useState('Todos');
 const [editing,setEditing]=useState<TeamMember|null>(null),[inviting,setInviting]=useState(false);
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[busyId,setBusyId]=useState('');
 const [shareUrl,setShareUrl]=useState('');

 const refreshInvitations=async()=>{try{setInvitations(await listInvitations());setError('')}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível carregar os convites.')}};
 useEffect(()=>{const update=()=>{setMembers(store.get('team',[]));setClients(store.get('clients',[]))};window.addEventListener('roas-change',update);void refreshInvitations();return()=>window.removeEventListener('roas-change',update)},[]);
 const save=(next:TeamMember[])=>{setMembers(next);store.set('team',next)};
 const flash=(message:string)=>{setNotice(message);setTimeout(()=>setNotice(''),2800)};
 const filtered=useMemo(()=>members.filter(member=>(department==='Todos'||member.department===department)&&`${member.name} ${memberRoles(member).join(' ')} ${member.email}`.toLowerCase().includes(query.toLowerCase())),[members,query,department]);
 const activeAdmins=members.filter(member=>member.status==='active'&&isAdministrator(member)).length;

 const editMember=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(!editing)return;
  const form=new FormData(event.currentTarget),selectedRoles=form.getAll('roles').map(String),selectedClients=form.getAll('clients').map(String),selectedAreas=form.getAll('accessAreas').map(String) as AccessArea[];
  const member:TeamMember={...editing,name:String(form.get('name')),email:String(form.get('email')).trim().toLowerCase(),role:selectedRoles[0]||roles[1],roles:selectedRoles,clientIds:selectedClients,accessAreas:selectedAreas.length?selectedAreas:['general'],department:String(form.get('department')),updatedAt:new Date().toISOString()};
  save(members.map(current=>current.id===member.id?member:current));setEditing(null);flash('Membro e acessos atualizados');
 };
 const invite=async(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setError('');
  const form=new FormData(event.currentTarget);
  const input:InvitationInput={name:String(form.get('name')),email:String(form.get('email')).trim().toLowerCase(),department:String(form.get('department')),roles:form.getAll('roles').map(String),clientIds:form.getAll('clients').map(String),accessAreas:form.getAll('accessAreas').map(String) as AccessArea[]};
  if(!input.roles.length||!input.accessAreas.length){setError('Selecione ao menos um cargo e uma área de acesso.');return}
  setBusyId('new');
  try{const result=await createInvitation(input);setInvitations(current=>[result.invitation,...current]);setInviting(false);setShareUrl(result.inviteUrl);flash('Convite criado por 7 dias')}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível criar o convite.')}finally{setBusyId('')}
 };
 const resend=async(invitation:TeamInvitation)=>{setBusyId(invitation.id);try{const result=await resendInvitation(invitation.id);setInvitations(current=>current.map(item=>item.id===invitation.id?result.invitation:item));setShareUrl(result.inviteUrl);flash('Novo link gerado; o anterior foi invalidado')}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível renovar o convite.')}finally{setBusyId('')}};
 const revoke=async(invitation:TeamInvitation)=>{if(!confirm(`Cancelar o convite de ${invitation.email}?`))return;setBusyId(invitation.id);try{await revokeInvitation(invitation.id);setInvitations(current=>current.map(item=>item.id===invitation.id?{...item,status:'revoked'}:item));flash('Convite cancelado')}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível cancelar o convite.')}finally{setBusyId('')}};
 const toggleMember=(member:TeamMember)=>{
  if(member.status==='active'&&isAdministrator(member)&&activeAdmins<=1){setError('A agência precisa manter pelo menos um administrador ativo.');return}
  const nextStatus=member.status==='active'?'inactive':'active';
  if(confirm(`${nextStatus==='inactive'?'Suspender':'Reativar'} o acesso de ${member.name}?`)){save(members.map(current=>current.id===member.id?{...current,status:nextStatus,updatedAt:new Date().toISOString()}:current));flash(nextStatus==='inactive'?'Acesso suspenso':'Acesso reativado')}
 };
 const copyLink=async()=>{await navigator.clipboard.writeText(shareUrl);flash('Link copiado para a área de transferência')};

 return <main>
  <div className="teamPageHeader"><div><h2>Equipe e acessos</h2><p>Convide pessoas com prazo, áreas permitidas e clientes específicos.</p></div><button className="btn" onClick={()=>{setError('');setInviting(true)}}><Plus/> Convidar membro</button></div>
  <div className="teamStats"><article><span className="teamStatIcon purple"><UsersRound/></span><div><small>Membros cadastrados</small><strong>{members.length}</strong><em>{members.filter(member=>member.status==='active').length} ativos</em></div></article><article><span className="teamStatIcon green"><Clock3/></span><div><small>Convites pendentes</small><strong>{invitations.filter(item=>item.status==='pending').length}</strong><em>Expiram em 7 dias</em></div></article><article><span className="teamStatIcon blue"><BriefcaseBusiness/></span><div><small>Clientes atribuídos</small><strong>{new Set(members.flatMap(memberClients)).size}</strong><em>Acesso limitado por conta</em></div></article></div>
  <section className="card teamDirectory">
   <div className="teamAccessTabs"><button className={tab==='members'?'active':''} onClick={()=>setTab('members')}>Membros</button><button className={tab==='invitations'?'active':''} onClick={()=>setTab('invitations')}>Convites <span>{invitations.filter(item=>item.status==='pending').length}</span></button></div>
   {error&&<div className="teamAccessError">{error}<button onClick={()=>setError('')}><X/></button></div>}
   {tab==='members'?<>
    <div className="directoryTools"><div className="memberSearch"><Search/><input placeholder="Buscar membro..." value={query} onChange={event=>setQuery(event.target.value)}/></div><div className="departmentTabs">{departments.map(item=><button key={item} className={department===item?'active':''} onClick={()=>setDepartment(item)}>{item}</button>)}</div></div>
    <div className="memberGrid">{filtered.map(member=>{const linked=clients.filter(client=>memberClients(member).includes(client.id)),areas=memberAreas(member);return <article className="memberCard" key={member.id}><div className="memberTop"><Avatar name={member.name} color={member.color}/><span className={`badge ${member.status==='active'?'green':'red'}`}>{member.status==='active'?'Ativo':'Suspenso'}</span></div><h3>{member.name}</h3><div className="roleTags">{memberRoles(member).map(role=><span key={role}>{role}</span>)}</div><span className="memberDepartment">{member.department}</span><div className="memberEmail"><Mail/>{member.email}</div><div className="memberAccess"><b><Eye/> Pode visualizar</b><div>{areas.map(area=><span key={area}>{accessOptions.find(option=>option.id===area)?.label}</span>)}</div></div><div className="managedClients"><b>Clientes gerenciados ({linked.length})</b><p>{linked.length?linked.slice(0,3).map(client=>client.companyName).join(' · '):member.clientIds===undefined?'Todos os clientes':'Nenhum cliente vinculado'}</p></div><footer><button className="btn secondary" onClick={()=>setEditing(member)}><Pencil/> Editar</button><button className="iconBtn memberDelete" title={member.status==='active'?'Suspender acesso':'Reativar acesso'} onClick={()=>toggleMember(member)}><UserMinus/></button></footer></article>})}</div>
    {!filtered.length&&<div className="emptyTeam">Nenhum membro encontrado.</div>}
   </>:<InvitationList invitations={invitations} clients={clients} busyId={busyId} onResend={resend} onRevoke={revoke}/>}
  </section>
  {notice&&<div className="toast"><CheckCircle2/> {notice}</div>}
  {editing&&<MemberModal editing={editing} clients={clients} onClose={()=>setEditing(null)} onSubmit={editMember}/>}
  {inviting&&<InviteModal clients={clients} busy={busyId==='new'} onClose={()=>setInviting(false)} onSubmit={invite}/>}
  {shareUrl&&<ShareModal url={shareUrl} onCopy={copyLink} onClose={()=>setShareUrl('')}/>}
 </main>
}

function InvitationList({invitations,clients,busyId,onResend,onRevoke}:{invitations:TeamInvitation[];clients:Client[];busyId:string;onResend:(item:TeamInvitation)=>void;onRevoke:(item:TeamInvitation)=>void}){
 if(!invitations.length)return <div className="emptyTeam">Nenhum convite criado. Use “Convidar membro” para começar.</div>;
 return <div className="invitationList">{invitations.map(item=><article key={item.id} className="invitationRow"><Avatar name={item.name}/><div className="invitationPerson"><b>{item.name}</b><span><Mail/>{item.email}</span></div><div><small>Cargos</small><p>{item.roles.join(' · ')}</p></div><div><small>Acessos</small><p>{item.accessAreas.map(area=>accessOptions.find(option=>option.id===area)?.label).join(' · ')}</p></div><div><small>Clientes</small><p>{item.clientIds.length?item.clientIds.map(id=>clients.find(client=>client.id===id)?.companyName).filter(Boolean).join(' · '):'Nenhum'}</p></div><span className={`invitationStatus ${item.status}`}>{statusLabels[item.status]}</span><div className="invitationActions">{item.status!=='accepted'&&<><button className="btn secondary" disabled={busyId===item.id} onClick={()=>onResend(item)}><RotateCw/> Renovar link</button>{item.status!=='revoked'&&<button className="iconBtn memberDelete" onClick={()=>onRevoke(item)}><X/></button>}</>}</div></article>)}</div>;
}

function AccessFields({editing,clients}:{editing?:TeamMember;clients:Client[]}){
 const selectedAreas=memberAreas(editing);
 return <><div className="full"><b className="formGroupLabel">Cargos</b><small className="formHelper">Selecione um ou mais cargos.</small><div className="selectionGrid">{roles.map(role=><label key={role}><input name="roles" type="checkbox" value={role} defaultChecked={memberRoles(editing).includes(role)}/>{role}</label>)}</div></div><div className="full"><b className="formGroupLabel"><ShieldCheck/> Permissões de visualização</b><small className="formHelper">O servidor também bloqueará áreas não permitidas.</small><div className="accessSelectionGrid">{accessOptions.map(option=><label key={option.id}><input name="accessAreas" type="checkbox" value={option.id} defaultChecked={editing?selectedAreas.includes(option.id):option.id==='general'}/><span><b>{option.label}</b><small>{option.description}</small></span></label>)}</div></div><div className="full"><b className="formGroupLabel">Clientes gerenciados</b><small className="formHelper">Sem seleção, o membro não verá contas de clientes.</small><div className="selectionGrid clientsSelect">{clients.map(client=><label key={client.id}><input name="clients" type="checkbox" value={client.id} defaultChecked={memberClients(editing).includes(client.id)}/>{client.companyName}</label>)}</div></div></>;
}

function MemberModal({editing,clients,onClose,onSubmit}:{editing:TeamMember;clients:Client[];onClose:()=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void}){return <div className="overlay"><div className="modal memberModal"><div className="modalHead"><div><small>EDITAR MEMBRO</small><h2>Atualizar acessos</h2></div><button className="iconBtn" onClick={onClose}><X/></button></div><form className="form memberForm" onSubmit={onSubmit}><label>Nome completo<input name="name" required defaultValue={editing.name}/></label><label>E-mail<input name="email" type="email" required defaultValue={editing.email}/></label><label>Departamento<select name="department" defaultValue={editing.department}>{departments.slice(1).map(item=><option key={item}>{item}</option>)}</select></label><AccessFields editing={editing} clients={clients}/><div className="formActions full"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn">Salvar alterações</button></div></form></div></div>}

function InviteModal({clients,busy,onClose,onSubmit}:{clients:Client[];busy:boolean;onClose:()=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void}){return <div className="overlay"><div className="modal memberModal"><div className="modalHead"><div><small>NOVO CONVITE</small><h2>Convidar para a equipe</h2><p>O link será válido por 7 dias e só funcionará para o e-mail informado.</p></div><button className="iconBtn" onClick={onClose}><X/></button></div><form className="form memberForm" onSubmit={onSubmit}><label>Nome completo<input name="name" required minLength={2}/></label><label>E-mail de acesso<input name="email" type="email" required/></label><label>Departamento<select name="department" defaultValue="Marketing">{departments.slice(1).map(item=><option key={item}>{item}</option>)}</select></label><AccessFields clients={clients}/><div className="formActions full"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn" disabled={busy}>{busy?'Criando convite…':'Criar convite'}</button></div></form></div></div>}

function ShareModal({url,onCopy,onClose}:{url:string;onCopy:()=>void;onClose:()=>void}){return <div className="overlay"><div className="modal inviteShareModal"><div className="modalHead"><div><small>CONVITE CRIADO</small><h2>Compartilhe o acesso</h2></div><button className="iconBtn" onClick={onClose}><X/></button></div><p>Envie este link somente para a pessoa convidada. Ao renovar o convite, o link anterior deixa de funcionar.</p><div className="inviteLink"><input readOnly value={url}/><button className="btn" onClick={onCopy}><Clipboard/> Copiar link</button></div><div className="inviteSecurity"><ShieldCheck/><span>Válido por 7 dias · uso único · vinculado ao e-mail</span></div></div></div>}
