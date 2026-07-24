import {NavLink,useLocation} from 'react-router-dom';
import type {AccessArea,TeamMember} from '../types';
import AgencyLogo from './AgencyLogo';
import {canAccessPath} from './access-control';
import {navGroups} from './navigation';

export default function Sidebar({open,member,accessAreas,onNavigate}:{open:boolean;member?:TeamMember;accessAreas?:AccessArea[];onNavigate:()=>void}){
 const location=useLocation();
 return <aside id="app-sidebar" className={`sidebar ${open?'open':'closed'}`}>
  <div className="sideTop"><AgencyLogo/></div>
  <nav>{navGroups.map(group=>{
   const items=group.items.filter(item=>canAccessPath(member,`/${item.path}`,accessAreas));
   if(!items.length)return null;
   return <div className="navGroup" key={group.label}>
    {group.label&&<span>{group.label}</span>}
    {items.map(({path,label,icon:Icon})=><NavLink key={path} title={!open?label:undefined} className={location.pathname.split('/')[1]===path?'active':''} to={`/${path}`} onClick={onNavigate}><Icon/>{open&&<em>{label}</em>}</NavLink>)}
   </div>
  })}</nav>
 </aside>
}
