import {mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('.sites-runtime',{recursive:true});
const config='.sites-runtime/local-d1.json';
writeFileSync(config,JSON.stringify({name:'yemu-local',compatibility_date:'2026-05-15',d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:'../drizzle'}]}));
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',config,'--persist-to','.wrangler/state'],{stdio:'inherit'});
if(result.error)throw result.error;process.exit(result.status??1);
