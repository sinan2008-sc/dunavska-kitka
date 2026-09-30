import {readFileSync,writeFileSync} from 'node:fs';
const input=process.argv[2];if(!input)throw Error('Usage: node scripts/convert-export.mjs /private/export.json');
const raw=readFileSync(input,'utf8');if(raw.includes('[truncated for model]'))throw Error('Partial export is unsafe');
const parsed=JSON.parse(raw);if(!Array.isArray(parsed.records)||!Array.isArray(parsed.votes))throw Error('Expected full {records:[],votes:[]}');
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const statements=['BEGIN;'];
for(const r of parsed.records){if(!r.id||!r.kind||!r.created)throw Error('Incomplete record');let data=typeof r.data==='string'?JSON.parse(r.data):r.data;statements.push(`INSERT INTO public.site_records(id,kind,data,created) VALUES (${quote(r.id)},${quote(r.kind)},${quote(JSON.stringify(data))}::jsonb,${quote(r.created)}::timestamptz) ON CONFLICT (id) DO UPDATE SET data=excluded.data,kind=excluded.kind,created=excluded.created;`)}
for(const v of parsed.votes){if(!v.poll_id||!v.voter||!Number.isInteger(v.answer))throw Error('Incomplete vote');statements.push(`INSERT INTO public.votes(id,poll_id,voter,answer) VALUES (${quote(v.id)},${quote(v.poll_id)},${quote(v.voter)}::uuid,${v.answer}) ON CONFLICT (poll_id,voter) DO UPDATE SET answer=excluded.answer;`)}
statements.push('COMMIT;');writeFileSync('import.sql',statements.join('\n'));console.log(`Wrote ${parsed.records.length} records and ${parsed.votes.length} votes to import.sql`);
