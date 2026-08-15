import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();
if(process.env.ATLAS_CREDENTIALS_FILE){
  const credentialsPath=process.env.ATLAS_CREDENTIALS_FILE;
  if(fs.existsSync(credentialsPath))dotenv.config({path:credentialsPath,override:false});
  else console.warn(`Atlas credentials file not found: ${credentialsPath}. Falling back to environment variables.`);
}

function mongoUri(){
  const uri=process.env.MONGODB_URI;
  if(!uri)throw new Error('MONGODB_URI is required');
  const username=process.env.MONGODB_USERNAME;
  const password=process.env.MONGODB_PASSWORD;
  return uri
    .replace('<username>',encodeURIComponent(username||''))
    .replace('<password>',encodeURIComponent(password||''))
    .replace('${MONGODB_USERNAME}',encodeURIComponent(username||''))
    .replace('${MONGODB_PASSWORD}',encodeURIComponent(password||''));
}

export const config={
  port:Number(process.env.PORT||3333),
  mongoUri,
  corsOrigins:(process.env.CORS_ORIGIN||'http://127.0.0.1:5173,http://localhost:5173').split(',').map(value=>value.trim()),
  firebaseProjectId:process.env.FIREBASE_PROJECT_ID||'flowroas-space',
  appOrigin:process.env.APP_ORIGIN||process.env.CORS_ORIGIN?.split(',')[0]?.trim()||'http://127.0.0.1:5173',
  oauthStateSecret:process.env.OAUTH_STATE_SECRET||'',
  marketingTokenEncryptionKey:process.env.MARKETING_TOKEN_ENCRYPTION_KEY||'',
  metaAppId:process.env.META_APP_ID||'',
  metaAppSecret:process.env.META_APP_SECRET||'',
  metaGraphApiVersion:process.env.META_GRAPH_API_VERSION||'',
  googleOauthClientId:process.env.GOOGLE_OAUTH_CLIENT_ID||'',
  googleOauthClientSecret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||'',
  googleAdsDeveloperToken:process.env.GOOGLE_ADS_DEVELOPER_TOKEN||'',
  googleAdsApiVersion:process.env.GOOGLE_ADS_API_VERSION||'v25',
};
