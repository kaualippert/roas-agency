import {useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import type {CurrentAccess,TeamMember} from '../types';
import {auth} from '../firebase';
import {store} from '../storage';
import AccessDenied from './AccessDenied';
import {canAccessPath} from './access-control';
import AppHeader,{type LayoutNotification} from './AppHeader';
import Sidebar from './Sidebar';
import './access-control.css';

export default function AppLayout({children}:{children:React.ReactNode}){
 const location=useLocation();
 const [sidebarOpen,setSidebarOpen]=useState(()=>window.matchMedia('(min-width: 801px)').matches?(localStorage.getItem('roas_sidebar_open')!=='false'):false);
 const [team,setTeam]=useState<TeamMember[]>(()=>store.get('team',[]));
 const [access,setAccess]=useState<CurrentAccess|null>(()=>store.access());
 const [notifications,setNotifications]=useState<LayoutNotification[]>(()=>store.get('notifications',[]));
 useEffect(()=>{
  const update=()=>{setTeam(store.get('team',[]));setAccess(store.access());setNotifications(store.get('notifications',[]))};
  window.addEventListener('roas-change',update);
  update();
  return()=>window.removeEventListener('roas-change',update);
 },[]);
 useEffect(()=>{
  const desktop=window.matchMedia('(min-width: 801px)');
  const saved=localStorage.getItem('roas_sidebar_open');
  if(desktop.matches&&saved!==null)setSidebarOpen(saved==='true');
  const listener=(event:Event)=>{if(desktop.matches)setSidebarOpen(Boolean((event as CustomEvent).detail))};
  window.addEventListener('roas-sidebar-toggle',listener);
  return()=>window.removeEventListener('roas-sidebar-toggle',listener);
 },[]);
 useEffect(()=>{
  const mobile=window.matchMedia('(max-width: 800px)');
  const sync=(event:MediaQueryListEvent)=>setSidebarOpen(event.matches?false:localStorage.getItem('roas_sidebar_open')!=='false');
  mobile.addEventListener('change',sync);
  return()=>mobile.removeEventListener('change',sync);
 },[]);
 useEffect(()=>{if(window.matchMedia('(max-width: 800px)').matches)setSidebarOpen(false)},[location.pathname]);
 useEffect(()=>{
  const mobile=window.matchMedia('(max-width: 800px)').matches;
  document.body.classList.toggle('mobileNavOpen',mobile&&sidebarOpen);
  const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&mobile)setSidebarOpen(false)};
  window.addEventListener('keydown',close);
  return()=>{document.body.classList.remove('mobileNavOpen');window.removeEventListener('keydown',close)};
 },[sidebarOpen]);
 const email=auth.currentUser?.email?.toLowerCase();
 const member=access?.member||team.find(item=>item.status==='active'&&item.email.toLowerCase()===email);
 const verifiedAreas=access?.accessAreas;
 const allowed=canAccessPath(member||undefined,location.pathname,verifiedAreas);
 const closeMobileMenu=()=>{if(window.matchMedia('(max-width: 800px)').matches)setSidebarOpen(false)};
 return <>
  <Sidebar open={sidebarOpen} member={member||undefined} accessAreas={verifiedAreas} onNavigate={closeMobileMenu}/>
  {sidebarOpen&&<button className="sidebarBackdrop" type="button" aria-label="Fechar menu" onClick={()=>setSidebarOpen(false)}/>}
  <div className={`shell ${sidebarOpen?'wide':'narrow'}`}>
   <AppHeader onMenu={()=>setSidebarOpen(value=>!value)} member={member||undefined} accessAreas={verifiedAreas} notifications={notifications}/>
   {allowed?children:<AccessDenied member={member||undefined} accessAreas={verifiedAreas}/>}
  </div>
 </>
}
