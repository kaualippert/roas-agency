import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
export default function RouteUiState(){const location=useLocation();useEffect(()=>{document.body.classList.toggle('crm-route',location.pathname==='/crm');return()=>document.body.classList.remove('crm-route')},[location.pathname]);return null}
