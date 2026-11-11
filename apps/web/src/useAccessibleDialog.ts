import {useEffect,useRef} from 'react';

const focusableSelector='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

export function useAccessibleDialog<T extends HTMLElement>({open,onClose}:{open:boolean;onClose:()=>void}){
 const dialogRef=useRef<T>(null);
 const onCloseRef=useRef(onClose);
 onCloseRef.current=onClose;

 useEffect(()=>{
  if(!open)return;
  const dialog=dialogRef.current;
  if(!dialog)return;
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const isVisible=(element:HTMLElement)=>!element.closest('[aria-hidden="true"]')&&element.getClientRects().length>0&&window.getComputedStyle(element).visibility!=='hidden';
  const getFocusable=()=>Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(isVisible);
  const preferredFocus=dialog.querySelector<HTMLElement>('[autofocus],[data-autofocus]');
  const initialFocus=preferredFocus&&isVisible(preferredFocus)?preferredFocus:Array.from(dialog.querySelectorAll<HTMLElement>('input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[contenteditable="true"]')).find(isVisible)||getFocusable()[0]||dialog;
  initialFocus.focus();

  const handleKeyDown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){
    event.preventDefault();
    event.stopPropagation();
    onCloseRef.current();
    return;
   }
   if(event.key!=='Tab')return;
   const focusable=getFocusable();
   if(!focusable.length){event.preventDefault();dialog.focus();return}
   const first=focusable[0],last=focusable[focusable.length-1],active=document.activeElement;
   if(!dialog.contains(active)){
    event.preventDefault();
    (event.shiftKey?last:first).focus();
   }else if(event.shiftKey&&active===first){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&active===last){
    event.preventDefault();first.focus();
   }
  };
  document.addEventListener('keydown',handleKeyDown,true);
  return ()=>{
   document.removeEventListener('keydown',handleKeyDown,true);
   if(previousFocus?.isConnected)previousFocus.focus();
  };
 },[open]);

 return dialogRef;
}
