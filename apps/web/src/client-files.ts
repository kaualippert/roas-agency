import {getIdToken} from './firebase';

const apiUrl=(import.meta.env.VITE_API_URL||(import.meta.env.PROD?'/api':'http://127.0.0.1:3333/api')).replace(/\/$/,'');

async function authenticatedHeaders(){
 const token=await getIdToken();
 if(!token)throw new Error('Sessão não autenticada.');
 return {authorization:`Bearer ${token}`};
}

export async function uploadClientFile(clientId:string,file:File){
 const params=new URLSearchParams({name:file.name,type:file.type});
 const response=await fetch(`${apiUrl}/files/${encodeURIComponent(clientId)}?${params}`,{method:'POST',headers:await authenticatedHeaders(),body:file});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error||'Não foi possível importar o arquivo.');
 return body as {fileId:string;name:string;mimeType:string;size:number};
}

export async function openClientFile(fileId:string,download=false){
 const response=await fetch(`${apiUrl}/files/${encodeURIComponent(fileId)}`,{headers:await authenticatedHeaders()});
 if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||'Não foi possível abrir o arquivo.');}
 const blob=await response.blob(),url=URL.createObjectURL(blob),anchor=document.createElement('a');
 anchor.href=url;anchor.target='_blank';anchor.rel='noopener';
 if(download)anchor.download=decodeURIComponent(response.headers.get('x-file-name')||'arquivo');
 anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
}

export async function deleteClientFile(fileId:string){
 const response=await fetch(`${apiUrl}/files/${encodeURIComponent(fileId)}`,{method:'DELETE',headers:await authenticatedHeaders()});
 if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||'Não foi possível excluir o arquivo.');}
}
