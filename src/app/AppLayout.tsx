import {useEffect,useState} from 'react';
import {Bell,ChevronDown,ChevronsLeft,ChevronsRight,LockKeyhole,Menu} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import type {TeamMember} from '../types';
import {store} from '../storage';
import {canAccessPath,currentMemberStorageKey,firstAllowedPath,memberRoles,resolveCurrentMember} from './access-control';
import {navGroups,pageMeta} from './navigation';
import './access-control.css';

function Logo(){return <div className="logo"><div className="rmark">R</div><div><b>ROAS</b><small>AGÊNCIA DE PERFORMANCE</small></div></div>}
const initials=(name:string)=>name.split(' ').slice(0,2).map(part=>part[0]).join('').toUpperCase();

function Sidebar({open,setOpen,member,onNavigate}:{open:boolean;setOpen:(value:boolean)=>void;member?:TeamMember;onNavigate:()=>void}){
 const location=useLocation();
 useEffect(()=>{const desktop=window.matchMedia('(min-width: 801px)'),saved=localStorage.getItem('roas_sidebar_open');if(desktop.matches&&saved!==null)setOpen(saved==='true');const listener=(event:Event)=>{if(desktop.matches)setOpen(Boolean((event as CustomEvent).detail))};window.addEventListener('roas-sidebar-toggle',listener);return()=>window.removeEventListener('roas-sidebar-toggle',listener)},[setOpen]);
 const toggle=()=>{const next=!open;setOpen(next);if(window.matchMedia('(min-width: 801px)').matches)localStorage.setItem('roas_sidebar_open',String(next))};
 return <aside id="app-sidebar" className={`sidebar ${open?'open':'closed'}`}><div className="sideTop"><Logo/><button className="iconBtn collapse" title={open?'Recolher menu':'Expandir menu'} aria-label={open?'Recolher menu':'Expandir menu'} onClick={toggle}>{open?<ChevronsLeft/>:<ChevronsRight/>}</button></div><nav>{navGroups.map(group=>{const items=group.items.filter(item=>canAccessPath(member,`/${item.path}`));if(!items.length)return null;return <div className="navGroup" key={group.label}>{group.label&&<span>{group.label}</span>}{items.map(({path,label,icon:Icon})=><a key={path} title={!open?label:undefined} className={location.pathname.split('/')[1]===path?'active':''} href={`/${path}`} onClick={onNavigate}><Icon/>{open&&<em>{label}</em>}</a>)}</div>})}</nav></aside>
}

function Header({onMenu,member,team,onMemberChange}:{onMenu:()=>void;member?:TeamMember;team:TeamMember[];onMemberChange:(id:string)=>void}){
 const location=useLocation(),key=location.pathname.split('/')[1]||'dashboard',meta=pageMeta[key]||pageMeta.dashboard,[profileOpen,setProfileOpen]=useState(false),name=member?.name||'Gabriel Rocha',role=memberRoles(member)[0]||'Administrador';
 return <header><button className="mobileMenu iconBtn" onClick={onMenu} aria-label="Abrir menu" aria-controls="app-sidebar"><Menu/></button><div className="headTitle"><h1>{meta.title}</h1><p>{meta.sub}</p></div><div className="headerSpacer"/><button className="iconBtn notification" aria-label="Abrir notificações"><Bell/><i>3</i></button><div className="profileSession"><button type="button" className="profile" onClick={()=>setProfileOpen(value=>!value)} aria-expanded={profileOpen} aria-label="Abrir perfil"><div className="userAvatar">{initials(name)}</div><div><b>{name}</b><small>{role}</small></div><ChevronDown/></button>{profileOpen&&<div className="profileMenu"><small>USUÁRIO DA SESSÃO</small>{team.filter(item=>item.status==='active').map(item=><button key={item.id} className={item.id===member?.id?'active':''} onClick={()=>{onMemberChange(item.id);setProfileOpen(false)}}><span style={{background:item.color}}>{initials(item.name)}</span><div><b>{item.name}</b><small>{memberRoles(item).join(', ')}</small></div></button>)}</div>}</div></header>
}

function AccessDenied({member}:{member?:TeamMember}){return <main><section className="card accessDenied"><LockKeyhole/><h2>Acesso não permitido</h2><p>{member?.name||'Este usuário'} não possui permissão para visualizar esta área.</p><a className="btn" href={firstAllowedPath(member)}>Ir para uma área permitida</a></section></main>}

export default function AppLayout({children}:{children:React.ReactNode}){
 const location=useLocation(),[sidebarOpen,setSidebarOpen]=useState(()=>window.matchMedia('(min-width: 801px)').matches?(localStorage.getItem('roas_sidebar_open')!=='false'):false),[team,setTeam]=useState<TeamMember[]>(()=>store.get('team',[])),[currentId,setCurrentId]=useState(()=>localStorage.getItem(currentMemberStorageKey)||'');
 useEffect(()=>{const update=()=>setTeam(store.get('team',[])),session=()=>setCurrentId(localStorage.getItem(currentMemberStorageKey)||'');window.addEventListener('roas-change',update);window.addEventListener('roas-session-member',session);update();return()=>{window.removeEventListener('roas-change',update);window.removeEventListener('roas-session-member',session)}},[]);
 useEffect(()=>{const mobile=window.matchMedia('(max-width: 800px)'),sync=(event:MediaQueryListEvent)=>setSidebarOpen(event.matches?false:localStorage.getItem('roas_sidebar_open')!=='false');mobile.addEventListener('change',sync);return()=>mobile.removeEventListener('change',sync)},[]);
 useEffect(()=>{if(window.matchMedia('(max-width: 800px)').matches)setSidebarOpen(false)},[location.pathname]);
 useEffect(()=>{const mobile=window.matchMedia('(max-width: 800px)').matches;document.body.classList.toggle('mobileNavOpen',mobile&&sidebarOpen);const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&mobile)setSidebarOpen(false)};window.addEventListener('keydown',close);return()=>{document.body.classList.remove('mobileNavOpen');window.removeEventListener('keydown',close)}},[sidebarOpen]);
 const member=team.find(item=>item.id===currentId&&item.status==='active')||resolveCurrentMember(team);
 const selectMember=(id:string)=>{localStorage.setItem(currentMemberStorageKey,id);setCurrentId(id);window.dispatchEvent(new CustomEvent('roas-session-member',{detail:id}))};
 const allowed=canAccessPath(member,location.pathname);
 const closeMobileMenu=()=>{if(window.matchMedia('(max-width: 800px)').matches)setSidebarOpen(false)};
 return <><Sidebar open={sidebarOpen} setOpen={setSidebarOpen} member={member} onNavigate={closeMobileMenu}/>{sidebarOpen&&<button className="sidebarBackdrop" aria-label="Fechar menu" onClick={()=>setSidebarOpen(false)}/>}<div className={`shell ${sidebarOpen?'wide':'narrow'}`}><Header onMenu={()=>setSidebarOpen(value=>!value)} member={member} team={team} onMemberChange={selectMember}/>{allowed?children:<AccessDenied member={member}/>}</div></>
}
