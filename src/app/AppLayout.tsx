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

function Sidebar({open,setOpen,member}:{open:boolean;setOpen:(value:boolean)=>void;member?:TeamMember}){
 const location=useLocation();
 useEffect(()=>{const saved=localStorage.getItem('roas_sidebar_open');if(saved!==null)setOpen(saved==='true');const listener=(event:Event)=>setOpen(Boolean((event as CustomEvent).detail));window.addEventListener('roas-sidebar-toggle',listener);return()=>window.removeEventListener('roas-sidebar-toggle',listener)},[setOpen]);
 const toggle=()=>{const next=!open;setOpen(next);localStorage.setItem('roas_sidebar_open',String(next))};
 return <aside className={`sidebar ${open?'open':'closed'}`}><div className="sideTop"><Logo/><button className="iconBtn collapse" title={open?'Recolher menu':'Expandir menu'} aria-label={open?'Recolher menu':'Expandir menu'} onClick={toggle}>{open?<ChevronsLeft/>:<ChevronsRight/>}</button></div><nav>{navGroups.map(group=>{const items=group.items.filter(item=>canAccessPath(member,`/${item.path}`));if(!items.length)return null;return <div className="navGroup" key={group.label}>{group.label&&<span>{group.label}</span>}{items.map(({path,label,icon:Icon})=><a key={path} title={!open?label:undefined} className={location.pathname.split('/')[1]===path?'active':''} href={`/${path}`}><Icon/>{open&&<em>{label}</em>}</a>)}</div>})}</nav></aside>
}

function Header({onMenu,member,team,onMemberChange}:{onMenu:()=>void;member?:TeamMember;team:TeamMember[];onMemberChange:(id:string)=>void}){
 const location=useLocation(),key=location.pathname.split('/')[1]||'dashboard',meta=pageMeta[key]||pageMeta.dashboard,[profileOpen,setProfileOpen]=useState(false),name=member?.name||'Gabriel Rocha',role=memberRoles(member)[0]||'Administrador';
 return <header><button className="mobileMenu iconBtn" onClick={onMenu}><Menu/></button><div className="headTitle"><h1>{meta.title}</h1><p>{meta.sub}</p></div><div className="headerSpacer"/><button className="iconBtn notification"><Bell/><i>3</i></button><div className="profileSession"><button type="button" className="profile" onClick={()=>setProfileOpen(value=>!value)} aria-expanded={profileOpen}><div className="userAvatar">{initials(name)}</div><div><b>{name}</b><small>{role}</small></div><ChevronDown/></button>{profileOpen&&<div className="profileMenu"><small>USUÁRIO DA SESSÃO</small>{team.filter(item=>item.status==='active').map(item=><button key={item.id} className={item.id===member?.id?'active':''} onClick={()=>{onMemberChange(item.id);setProfileOpen(false)}}><span style={{background:item.color}}>{initials(item.name)}</span><div><b>{item.name}</b><small>{memberRoles(item).join(', ')}</small></div></button>)}</div>}</div></header>
}

function AccessDenied({member}:{member?:TeamMember}){return <main><section className="card accessDenied"><LockKeyhole/><h2>Acesso não permitido</h2><p>{member?.name||'Este usuário'} não possui permissão para visualizar esta área.</p><a className="btn" href={firstAllowedPath(member)}>Ir para uma área permitida</a></section></main>}

export default function AppLayout({children}:{children:React.ReactNode}){
 const location=useLocation(),[sidebarOpen,setSidebarOpen]=useState(true),[team,setTeam]=useState<TeamMember[]>(()=>store.get('team',[])),[currentId,setCurrentId]=useState(()=>localStorage.getItem(currentMemberStorageKey)||'');
 useEffect(()=>{const update=()=>setTeam(store.get('team',[])),session=()=>setCurrentId(localStorage.getItem(currentMemberStorageKey)||'');window.addEventListener('roas-change',update);window.addEventListener('roas-session-member',session);update();return()=>{window.removeEventListener('roas-change',update);window.removeEventListener('roas-session-member',session)}},[]);
 const member=team.find(item=>item.id===currentId&&item.status==='active')||resolveCurrentMember(team);
 const selectMember=(id:string)=>{localStorage.setItem(currentMemberStorageKey,id);setCurrentId(id);window.dispatchEvent(new CustomEvent('roas-session-member',{detail:id}))};
 const allowed=canAccessPath(member,location.pathname);
 return <><Sidebar open={sidebarOpen} setOpen={setSidebarOpen} member={member}/><div className={`shell ${sidebarOpen?'wide':'narrow'}`}><Header onMenu={()=>setSidebarOpen(!sidebarOpen)} member={member} team={team} onMemberChange={selectMember}/>{allowed?children:<AccessDenied member={member}/>}</div></>
}
