import vinext from 'vinext';
import {defineConfig} from 'vite';
export default defineConfig(async()=>{
 process.env.CLOUDFLARE_CF_FETCH_ENABLED='false';
 process.env.WRANGLER_SEND_METRICS='false';
 process.env.WRANGLER_WRITE_LOGS='false';
 process.env.WRANGLER_LOG_PATH='.wrangler/logs';
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {plugins:[vinext(),cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false,config:{name:'dunavska-kitka-admin',main:'./worker.ts',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],d1_databases:[{binding:'DB',database_name:'dunavska-kitka',database_id:'00000000-0000-4000-8000-000000000000'}],r2_buckets:[{binding:'BUCKET',bucket_name:'dunavska-kitka-media'}]}})]};
});
