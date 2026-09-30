import {readFileSync,writeFileSync} from 'node:fs';
const [input,output='import.sql']=process.argv.slice(2);
if(!input)throw Error('Usage: node scripts/import-data.mjs full-export.json import.sql');
const data=JSON.parse(readFileSync(input,'utf8'));
if(!Array.isArray(data.records)||!Array.isArray(data.votes))throw Error('Export must contain complete records and votes arrays');
const quote=value=>{if(typeof value!=='string'||value.includes('[truncated for model]'))throw Error('Incomplete export');return "'"+value.replaceAll("'","''")+"'"};
const rows=['-- Import into the NEW database only. Original database stays unchanged.'];
for(const row of data.records){JSON.parse(row.data);rows.push(`INSERT INTO records(id,kind,data,created) VALUES(${[row.id,row.kind,row.data,row.created].map(quote).join(',')});`)}
for(const row of data.votes){if(!Number.isInteger(row.answer))throw Error('Invalid vote');rows.push(`INSERT INTO votes(id,poll_id,voter,answer) VALUES(${[row.id,row.poll_id,row.voter].map(quote).join(',')},${row.answer});`)}
writeFileSync(output,rows.join('\n')+'\n',{mode:0o600});
console.log(`Prepared ${data.records.length} records and ${data.votes.length} votes.`);
