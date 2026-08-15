export interface LoadingBrand{agencyName:string;logoDataUrl:string;logoScale:number}

const cacheKey='roas_loading_brand';
const emptyBrand:LoadingBrand={agencyName:'ROAS',logoDataUrl:'',logoScale:100};

export function normalizeLoadingBrand(value:unknown):LoadingBrand{
 if(!value||typeof value!=='object')return emptyBrand;
 const source=value as Record<string,unknown>;
 const agencyName=String(source.agencyName||'').trim().slice(0,80)||'ROAS';
 const candidate=String(source.logoDataUrl||'');
 const logoDataUrl=/^data:image\/(?:png|jpeg|webp);base64,/i.test(candidate)?candidate:'';
 const logoScale=Math.min(200,Math.max(100,Number(source.logoScale)||100));
 return {agencyName,logoDataUrl,logoScale};
}

export function cacheLoadingBrand(value:unknown){
 try{localStorage.setItem(cacheKey,JSON.stringify(normalizeLoadingBrand(value)))}catch{/* O carregamento usa o fallback quando o cache do navegador está indisponível. */}
}

export function readLoadingBrand():LoadingBrand{
 try{return normalizeLoadingBrand(JSON.parse(localStorage.getItem(cacheKey)||'null'))}catch{return emptyBrand}
}
