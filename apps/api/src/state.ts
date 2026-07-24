import mongoose,{Schema} from 'mongoose';

const allowedKeys=new Set([
  'activities','agency_profile','clients','documents','financial_entries','general_settings',
  'notifications','notification_preferences','notification_sound_enabled','onboarding','projects','prospects','reports','services','tasks','team',
  'team_invitations',
  'campaigns','ads','creatives','invoices','payments','timeline','permissions','integrations','marketing_integrations','settings',
  'app_version'
]);

const stateSchema=new Schema({
  key:{type:String,required:true,unique:true,index:true},
  value:{type:Schema.Types.Mixed,required:true},
},{timestamps:true,versionKey:false});

// Legacy model used only to migrate installations that still have the old
// single `states` collection. New writes always use one collection per key.
const LegacyState=mongoose.models.State||mongoose.model('State',stateSchema);
const stateDocumentId='current';

interface StateCollectionDocument{
 _id:string;
 value:unknown;
 createdAt:Date;
 updatedAt:Date;
}

export function isAllowedKey(key:string){return allowedKeys.has(key)||/^editorial_[A-Za-z0-9-]+$/.test(key)}

function database(){
 const current=mongoose.connection.db;
 if(!current)throw new Error('MongoDB is not connected');
 return current;
}

function collectionFor(key:string){
 if(!isAllowedKey(key))throw new Error(`Unknown state key: ${key}`);
 return database().collection<StateCollectionDocument>(key);
}

async function writeCollectionValue(key:string,value:unknown){
 const now=new Date();
 const result=await collectionFor(key).findOneAndUpdate(
  {_id:stateDocumentId},
  {$set:{value,updatedAt:now},$setOnInsert:{createdAt:now}},
  {upsert:true,returnDocument:'after'},
 );
 return result?.value;
}

let migrationPromise:Promise<void>|null=null;

export async function migrateLegacyState(){
 if(migrationPromise)return migrationPromise;
 migrationPromise=(async()=>{
  const hasLegacy=await database().listCollections({name:'states'},{nameOnly:true}).hasNext();
  if(!hasLegacy)return;
  const documents=await LegacyState.find().lean();
  const migratable=documents.filter(document=>isAllowedKey(document.key));
  for(const document of migratable)await writeCollectionValue(document.key,document.value);
  if(migratable.length)await LegacyState.deleteMany({_id:{$in:migratable.map(document=>document._id)}});
  if(await LegacyState.countDocuments()===0){
   try{await database().dropCollection('states')}catch(error){
    if(!(error instanceof Error&&/ns not found|namespace not found/i.test(error.message)))throw error;
   }
  }
 })().finally(()=>{migrationPromise=null});
 return migrationPromise;
}

export async function allState(){
 await migrateLegacyState();
 const collections=await database().listCollections({},{nameOnly:true}).toArray();
 const keys=collections.map(collection=>collection.name).filter(isAllowedKey);
 const entries=await Promise.all(keys.map(async key=>{
  const document=await collectionFor(key).findOne({_id:stateDocumentId});
  return document?[key,document.value] as const:null;
 }));
 return Object.fromEntries(entries.filter((entry):entry is readonly [string,unknown]=>entry!==null));
}

export async function getState(key:string){
 await migrateLegacyState();
 const document=await collectionFor(key).findOne({_id:stateDocumentId});
 return document?.value;
}

export async function replaceState(key:string,value:unknown){
 await migrateLegacyState();
 return writeCollectionValue(key,value);
}

export async function deleteState(key:string){
 await migrateLegacyState();
 const exists=await database().listCollections({name:key},{nameOnly:true}).hasNext();
 if(exists)await database().dropCollection(key);
}

export async function replaceAllState(state:Record<string,unknown>){
 await migrateLegacyState();
 const entries=Object.entries(state).filter(([key])=>isAllowedKey(key));
 await Promise.all(entries.map(([key,value])=>writeCollectionValue(key,value)));
 const keep=new Set(entries.map(([key])=>key));
 const collections=await database().listCollections({},{nameOnly:true}).toArray();
 const obsolete=collections.map(collection=>collection.name).filter(key=>isAllowedKey(key)&&!keep.has(key));
 await Promise.all(obsolete.map(key=>database().dropCollection(key)));
 return allState();
}
