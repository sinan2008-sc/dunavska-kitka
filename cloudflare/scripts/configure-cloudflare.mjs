import {readFileSync,writeFileSync} from 'node:fs';
const required = ['CF_ACCOUNT_ID','CF_DATABASE_ID','CF_ACCESS_TEAM_DOMAIN','CF_ACCESS_AUD','CF_ADMIN_EMAILS'];
for (const key of required) if (!process.env[key]) throw Error('Missing ' + key);
const config = JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
config.name = 'dunavska-kitka-admin';
config.account_id = process.env.CF_ACCOUNT_ID;
config.workers_dev = true;
config.preview_urls = false;
config.vars = {
  PUBLIC_SITE_ORIGIN:'https://sinan2008-sc.github.io',
  ADMIN_EMAILS:process.env.CF_ADMIN_EMAILS,
  ACCESS_TEAM_DOMAIN:process.env.CF_ACCESS_TEAM_DOMAIN,
  ACCESS_AUD:process.env.CF_ACCESS_AUD
};
config.d1_databases = [{binding:'DB',database_name:'dunavska-kitka',database_id:process.env.CF_DATABASE_ID}];
config.r2_buckets = [{binding:'BUCKET',bucket_name:'dunavska-kitka-media'}];
writeFileSync('dist/server/wrangler.json',JSON.stringify(config,null,2));
writeFileSync('wrangler.public.json',JSON.stringify({
  name:'dunavska-kitka-api',account_id:config.account_id,main:'public-worker.mjs',
  compatibility_date:'2026-05-15',workers_dev:true,preview_urls:false,
  services:[{binding:'SERVER',service:config.name}]
},null,2));
