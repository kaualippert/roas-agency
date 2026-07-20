import {useEffect,useState} from 'react';
import {Bell,ChevronDown,ChevronsLeft,ChevronsRight,Menu} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {navGroups,pageMeta} from './navigation';
import {store} from '../storage';
import type {TeamMember} from '../types';

type Notification={read:boolean};

function Logo(){return <div className="logo"><div className="rmark">R</div><div><b>ROAS</b><small>AGÊNCIA DE PERFORMANCE</small></div></div>}

function Sidebar({open,setOpen}:{open:boolean;setOpen:(value:boolean)=>void}){
 const location=useLocation();
 useEffect(()=>{const saved=localStorage.getItem('roas_sidebar_open');if(saved!==null)setOpen(saved==='true');const listener=(event:Event)=>setOpen(Boolean((event as CustomEvent).detail));window.addEventListener('roas-sidebar-toggle',listener);return()=>window.removeEventListener('roas-sidebar-toggle',listener)},[setOpen]);
 const toggle=()=>{const next=!open;setOpen(next);localStorage.setItem('roas_sidebar_open',String(next))};
 return <aside className={`sidebar ${open?'open':'closed'}`}><div className="sideTop"><Logo/><button className="iconBtn collapse" title={open?'Recolher menu':'Expandir menu'} aria-label={open?'Recolher menu':'Expandir menu'} onClick={toggle}>{open?<ChevronsLeft/>:<ChevronsRight/>}</button></div><nav>{navGroups.map(group=><div className="navGroup" key={group.label}>{group.label&&<span>{group.label}</span>}{group.items.map(({path,label,icon:Icon})=><a key={path} title={!open?label:undefined} className={location.pathname.split('/')[1]===path?'active':''} href={`/${path}`}><Icon/>{open&&<em>{label}</em>}</a>)}</div>)}</nav></aside>
}

function Header({onMenu}:{onMenu:()=>void}){
 const location=useLocation(),key=location.pathname.split('/')[1]||'dashboard',meta=pageMeta[key]||pageMeta.dashboard;
 const [team,setTeam]=useState<TeamMember[]>(()=>store.get('team',[])),[notifications,setNotifications]=useState<Notification[]>(()=>store.get('notifications',[]));
 useEffect(()=>{const update=()=>{setTeam(store.get('team',[]));setNotifications(store.get('notifications',[]))};window.addEventListener('roas-change',update);return()=>window.removeEventListener('roas-change',update)},[]);
 const user=team.find(member=>member.status==='active')||team[0],unread=notifications.filter(item=>!item.read).length,initials=user?.name.split(' ').slice(0,2).map(part=>part[0]).join('').toUpperCase()||'—';
 return <header><button className="mobileMenu iconBtn" onClick={onMenu}><Menu/></button><div className="headTitle"><h1>{meta.title}</h1><p>{meta.sub}</p></div><div className="headerSpacer"/><button className="iconBtn notification"><Bell/>{unread>0&&<i>{unread}</i>}</button><div className="profile"><div className="userAvatar">{initials}</div><div><b>{user?.name||'Usuário não cadastrado'}</b><small>{user?.role||'Cadastre a equipe'}</small></div><ChevronDown/></div></header>
}

export default function AppLayout({children}:{children:React.ReactNode}){
 const [sidebarOpen,setSidebarOpen]=useState(true);
 return <><Sidebar open={sidebarOpen} setOpen={setSidebarOpen}/><div className={`shell ${sidebarOpen?'wide':'narrow'}`}><Header onMenu={()=>setSidebarOpen(!sidebarOpen)}/>{children}</div></>
}
