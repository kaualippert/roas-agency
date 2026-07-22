import type {Request,Response} from 'express';

async function loadRuntime(){
  const [{createApp},{connectDatabase}]=await Promise.all([
    import('../apps/api/src/app.js'),
    import('../apps/api/src/database.js'),
  ]);
  return {app:createApp(),connectDatabase};
}

let runtimePromise:ReturnType<typeof loadRuntime>|null=null;

export function resolveApiUrl(params:Request['query']){
  const path=Array.isArray(params.path)?params.path.join('/'):String(params.path||'');
  const searchParams=new URLSearchParams();
  Object.entries(params).forEach(([key,value])=>{
    if(key==='path')return;
    if(Array.isArray(value))value.forEach(item=>searchParams.append(key,String(item)));
    else if(value!==undefined)searchParams.set(key,String(value));
  });
  return `/api/${path}${searchParams.size?`?${searchParams}`:''}`;
}

export default async function handler(request:Request,response:Response){
  request.url=resolveApiUrl(request.query);
  if(request.url==='/api/health')return response.json({
    ok:true,
    service:'roas-agency-api',
    timestamp:new Date().toISOString(),
  });

  try{
    runtimePromise??=loadRuntime();
    const {app,connectDatabase}=await runtimePromise;
    await connectDatabase().catch(error=>console.error('MongoDB connection failed',error instanceof Error?error.message:error));
    return app(request,response);
  }catch(error){
    runtimePromise=null;
    console.error('API initialization failed',error);
    const runtimeError=error as Error&{code?:string};
    if(!response.headersSent)return response.status(500).json({error:'API initialization failed',detail:runtimeError.message,code:runtimeError.code});
    return response.end();
  }
}
