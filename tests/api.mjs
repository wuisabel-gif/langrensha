import ts from 'typescript';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
const out=fs.mkdtempSync(path.join(os.tmpdir(),'yemu-api-'));
for(const file of ['lib/game/model.ts','lib/game/bots.ts','lib/game/engine.ts','app/api/game/route.ts']){
 const target=path.join(out,file.replace(/\.ts$/,'.mjs'));fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/import \{ env \} from 'cloudflare:workers';/,'const env=globalThis.testEnv;').replace(/from '(\.[^']+)'/g,"from '$1.mjs'"));
}
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE rooms (code TEXT PRIMARY KEY,state TEXT NOT NULL,version INTEGER NOT NULL,updated_at INTEGER NOT NULL)');
let failures=0;globalThis.testEnv={DB:{prepare(query){return{bind(...args){return{async first(){return sql.prepare(query).get(...args);},async run(){if(query.startsWith('UPDATE')&&failures>0){failures--;return{meta:{changes:0}};}return{meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}};}};}}};
const {POST,GET}=await import(path.join(out,'app/api/game/route.mjs'));
const originalNow=Date.now;let now=100000;Date.now=()=>now;
async function post(action,payload={},token,status=200){const response=await POST(new Request('https://test/api/game',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action,...payload})}));const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));assert.equal(response.headers.get('Cache-Control'),'no-store');return data;}
async function poll(code,token,status=200){const response=await GET(new Request(`https://test/api/game?code=${code}`,{headers:{Authorization:`Bearer ${token}`}}));assert.equal(response.status,status);return response.json();}
try{
 sql.prepare('INSERT INTO rooms VALUES (?,?,0,?)').run('OLD','{}',now-86400001);
 const a=await post('create',{name:'甲'}),code=a.room.code;assert.equal(sql.prepare('SELECT code FROM rooms WHERE code=?').get('OLD'),undefined);
 const b=await post('join',{code,name:'乙'});await post('settings',{code,seconds:20},b.token,400);failures=2;await post('settings',{code,seconds:20},a.token);assert.equal(failures,0);
 await post('fill',{code},a.token);for(const p of [a,b])await post('ready',{code},p.token);await post('start',{code},a.token);
 const s=await post('join',{code,name:'观众'});assert.equal(s.room.isSpectator,true);assert.ok(s.room.players.every(p=>!p.role));await post('choice',{code,value:'ack'},s.token,400);await post('chat',{code,text:'场外信息'},s.token,400);
 await poll(code,'wrong-token',400);
 let state=await poll(code,a.token),steps=0;
 while(state.phase!=='finished'&&steps++<1200){
  for(const person of [a,b]){
   const v=await poll(code,person.token);assert.ok(!JSON.stringify(v).includes(s.token));
   if(v.canAct){let choice=v.options[0].value;if(v.phase==='nightWolf')choice=v.wolfVotes?.find(x=>x.target)?.target??choice;await post('choice',{code,value:choice},person.token);}
   else if(v.speaker===v.you)await post('endSpeech',{code},person.token);
  }
  now+=3000;state=await poll(code,a.token);
 }
 assert.equal(state.phase,'finished');assert.ok(state.players.every(p=>p.role));
 await post('rematch',{code},a.token);const rematch=await poll(code,s.token);assert.equal(rematch.isSpectator,false);assert.equal(rematch.phase,'lobby');assert.equal(rematch.myRole,undefined);assert.equal(rematch.winner,undefined);assert.ok(rematch.players.every(p=>!p.role));
 console.log('PASS actual API handlers with SQLite: cleanup, auth, CAS retries, spectators, complete mixed match, reveal, rematch and cleared secrets');
}finally{Date.now=originalNow;sql.close();fs.rmSync(out,{recursive:true,force:true});delete globalThis.testEnv;}
