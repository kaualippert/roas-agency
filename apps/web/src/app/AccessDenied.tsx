import {LockKeyhole} from 'lucide-react';
import {Link} from 'react-router-dom';
import type {TeamMember} from '../types';
import {firstAllowedPath} from './access-control';

export default function AccessDenied({member}:{member?:TeamMember}){
 return <main><section className="card accessDenied"><LockKeyhole/><h2>Acesso não permitido</h2><p>{member?.name||'Este usuário'} não possui permissão para visualizar esta área.</p><Link className="btn" to={firstAllowedPath(member)}>Ir para uma área permitida</Link></section></main>
}
