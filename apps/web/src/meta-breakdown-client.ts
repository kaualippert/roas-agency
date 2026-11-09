import {apiRequest} from './storage';
import type {MarketingRange} from './marketing-comparison';

export type MetaBreakdownDimension='age'|'gender'|'region'|'placement';
type Action='leads'|'purchases'|'conversations';
type Row={id:string;values:string[];currency:string|null;impressions:number|null;reach:number|null;clicks:number|null;spend:number|null}&Record<Action,number|null>;
type Result={integrationId:string;dimension:MetaBreakdownDimension;period:MarketingRange;rows:Row[];truncated:boolean};
type Query=MarketingRange&{integrationId:string;clientId:string;dimension:MetaBreakdownDimension};

export async function loadMetaBreakdown(query:Query,signal:AbortSignal):Promise<Result>{
 const result=await apiRequest('/marketing/breakdowns/meta_ads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(query),signal}) as Result|null;
 if(!result||result.integrationId!==query.integrationId||result.dimension!==query.dimension||result.period?.from!==query.from||result.period?.to!==query.to||!Array.isArray(result.rows))throw new Error('A resposta não corresponde ao recorte selecionado.');
 return result;
}
