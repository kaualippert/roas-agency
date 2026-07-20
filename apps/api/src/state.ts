import mongoose,{Schema} from 'mongoose';

const allowedKeys=new Set([
  'activities','agency_profile','clients','documents','financial_entries','general_settings',
  'notifications','notification_preferences','notification_sound_enabled','onboarding','projects','prospects','reports','services','tasks','team',
  'campaigns','ads','creatives','invoices','payments','timeline','permissions','integrations','settings',
  'app_version'
]);

const stateSchema=new Schema({
  key:{type:String,required:true,unique:true,index:true},
  value:{type:Schema.Types.Mixed,required:true},
},{timestamps:true,versionKey:false});

export const State=mongoose.model('State',stateSchema);
export function isAllowedKey(key:string){return allowedKeys.has(key)||/^editorial_[A-Za-z0-9-]+$/.test(key)}

export async function allState(){
  const documents=await State.find().lean();
  return Object.fromEntries(documents.map(document=>[document.key,document.value]));
}

export async function replaceState(key:string,value:unknown){
  const document=await State.findOneAndUpdate({key},{key,value},{upsert:true,new:true,setDefaultsOnInsert:true}).lean();
  return document?.value;
}

export async function deleteState(key:string){
  await State.deleteOne({key});
}

export async function replaceAllState(state:Record<string,unknown>){
  const entries=Object.entries(state).filter(([key])=>isAllowedKey(key));
  if(entries.length){
    await State.bulkWrite(entries.map(([key,value])=>({updateOne:{filter:{key},update:{$set:{value}},upsert:true}})));
    await State.deleteMany({key:{$nin:entries.map(([key])=>key)}});
  }else await State.deleteMany({});
  return allState();
}
