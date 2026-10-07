import ts from 'typescript';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const out=fs.mkdtempSync(path.join(os.tmpdir(),'yemu-test-'));
for(const file of ['model','bots','engine'])fs.writeFileSync(path.join(out,file+'.mjs'),ts.transpileModule(fs.readFileSync(`lib/game/${file}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from '([^']+)'/g,"from '$1.mjs'"));
const {createRoom,joinRoom,addBot,start,act,tick,view,resolveNight,resolveVote,checkWin}=await import(path.join(out,'engine.mjs'));
const {PRESETS}=await import(path.join(out,'model.mjs'));
function setup(preset='quick',bots=false){const r=createRoom('TEST','Host','host-secret',1000);r.preset=preset;while(r.players.length<PRESETS[preset].size)addBot(r);r.players.forEach(p=>{p.bot=bots;p.ready=true;});start(r,2000);r.players.forEach((p,i)=>p.role=PRESETS[preset].roles[i]);return r;}
function setPhase(r,phase){r.phase=phase;r.phaseStarted=1000;r.deadline=16000;r.choices={};}
function role(r,type){return r.players.find(p=>p.role===type);}
const invalid=createRoom('SAFE','Host','safe',1000);assert.throws(()=>act(invalid,invalid.host,'preset',{preset:'__proto__'},2000));assert.throws(()=>act(invalid,invalid.host,'preset',{preset:'toString'},2000));
// Every viewer gets only their own role and wolf teammates; nothing else secret.
for(const preset of Object.keys(PRESETS)){
 const r=setup(preset);setPhase(r,'nightWolf');
 const wolf=role(r,'wolf'),seer=role(r,'seer'),villager=role(r,'villager');
 act(r,wolf.id,'chat',{text:'PRIVATE WOLF'},2000);
 const guest=joinRoom(r,'Guest','spectator-secret');
 for(const p of [...r.players,guest]){
  const v=view(r,p.id,2000),raw=JSON.stringify(v);
  assert.ok(!raw.includes('host-secret'));assert.ok(!raw.includes('spectator-secret'));assert.equal('night' in v,false);
  for(const other of v.players)assert.equal(!!other.role,other.id===p.id||p.role==='wolf'&&r.players.find(x=>x.id===other.id).role==='wolf');
  if(p.role!=='wolf')assert.equal(raw.includes('PRIVATE WOLF'),false);
 }
 assert.throws(()=>act(r,villager.id,'choice',{value:wolf.id},2000));assert.throws(()=>act(r,guest.id,'chat',{text:'spoiler'},2000));
 setPhase(r,'nightSeer');act(r,seer.id,'choice',{value:wolf.id},3000);assert.equal(view(r,seer.id,3000).checks[0].wolf,true);assert.equal(view(r,villager.id,3000).checks.length,0);assert.throws(()=>act(r,seer.id,'choice',{value:villager.id},4000));
 setPhase(r,'nightWitch');r.night.kill=villager.id;const witch=role(r,'witch');assert.equal(view(r,witch.id,3000).wolfTarget,villager.id);assert.equal(view(r,seer.id,3000).wolfTarget,undefined);r.potions.save=false;assert.equal(view(r,witch.id,3000).wolfTarget,undefined);assert.ok(!view(r,witch.id,3000).options.some(o=>o.value==='save'));
}
// Night protection, self-save, poison and wolf-kill priority.
for(const [guard,save,dead] of [[false,false,true],[true,false,false],[false,true,false],[true,true,true]]){
 const r=setup('guard'),target=role(r,'villager').id;r.night={kill:target,guard:guard?target:undefined,save};resolveNight(r,2000);assert.equal(r.players.find(p=>p.id===target).alive,!dead);
}
{
 const r=setup('guard'),g=role(r,'guard');setPhase(r,'nightGuard');r.lastGuard=g.id;assert.throws(()=>act(r,g.id,'choice',{value:g.id},2000));
 const w=role(r,'witch');setPhase(r,'nightWitch');r.night.kill=w.id;assert.ok(!view(r,w.id,2000).options.some(o=>o.value==='save'));
}
{
 const r=setup('classic'),h=role(r,'hunter');r.night={kill:h.id,poison:h.id};resolveNight(r,2000);assert.ok(!r.hunters.includes(h.id));
 const q=setup('classic'),hunter=role(q,'hunter');q.night={kill:hunter.id};resolveNight(q,2000);assert.ok(q.hunters.includes(hunter.id));tick(q,q.deadline);assert.equal(q.phase,'hunter');assert.equal(view(q,q.host,5000).players.find(p=>p.id===hunter.id).role,'hunter');act(q,hunter.id,'choice',{value:role(q,'wolf').id},q.phaseStarted+1000);assert.equal(role(q,'wolf').alive,false);
}
{
 const r=setup('quick');role(r,'villager').alive=false;const w=role(r,'wolf');r.night={kill:role(r,'seer').id,poison:w.id};resolveNight(r,2000);assert.equal(r.winner,'wolves');assert.equal(w.alive,true);
}
// Disagreement produces an empty wolf attack; phases stay fixed despite choices.
{
 const r=setup('quick');setPhase(r,'nightWolf');const wolves=r.players.filter(p=>p.role==='wolf');act(r,wolves[0].id,'choice',{value:role(r,'seer').id},2000);act(r,wolves[1].id,'choice',{value:role(r,'witch').id},2000);assert.equal(r.phase,'nightWolf');tick(r,r.deadline);assert.equal(r.phase,'nightWitch');assert.equal(r.night.kill,undefined);
}
// Simultaneous ballots, PK eligibility, second tie = no exile.
{
 const r=setup();setPhase(r,'vote');const ids=r.players.map(p=>p.id);r.choices=Object.fromEntries(ids.map((x,i)=>[x,i%2?ids[0]:ids[1]]));assert.equal(view(r,ids[2],2000).ballots.length,0);resolveVote(r,2000);assert.equal(r.phase,'speech');assert.equal(r.pk,true);assert.equal(r.tied.length,2);setPhase(r,'vote');assert.equal(view(r,ids[0],2000).canAct,false);r.choices=Object.fromEntries(ids.slice(2).map((x,i)=>[x,ids[i%2]]));resolveVote(r,2000);assert.equal(r.phase,'nightWolf');assert.equal(r.players.filter(p=>p.alive).length,6);
}
// Victory models and default timeout do not award fictional moves.
{
 for(const preset of Object.keys(PRESETS)){const r=setup(preset);r.players.filter(p=>p.role==='wolf').forEach(p=>p.alive=false);assert.equal(checkWin(r),true);assert.equal(r.winner,'good');}
 const r=setup('guard');r.players.filter(p=>p.role==='villager').forEach(p=>p.alive=false);checkWin(r);assert.equal(r.winner,'wolves');
 const q=setup();setPhase(q,'vote');tick(q,q.deadline);assert.equal(q.ballots[0].votes.every(v=>v.target===null),true);
}
// Complete mixed-role games without access to unsanitized bot inputs.
for(const preset of Object.keys(PRESETS))for(let run=0;run<8;run++){
 const r=setup(preset,true);let steps=0,now=2000;
 while(r.phase!=='finished'&&steps++<3000){now+=3000;tick(r,now);for(const p of r.players){const v=view(r,p.id,now);assert.ok(!JSON.stringify(v).includes(p.token));}}
 assert.equal(r.phase,'finished',`${preset} stalled`);assert.ok(['good','wolves','draw'].includes(r.winner));
 r.players[0].bot=false;const s=joinRoom(r,'Late','late-secret');act(r,r.host,'rematch',{},now+1000);assert.equal(r.phase,'lobby');assert.equal(r.players.some(p=>p.id===s.id),true);assert.ok(r.players.every(p=>!p.role));assert.equal(r.winner,undefined);
}
// Fast AI is a host-only lobby setting, preserves human timers and fixed night timing.
{
 const r=createRoom('FAST','Host','fast-secret',1000);while(r.players.length<6)addBot(r);
 assert.throws(()=>act(r,r.players[1].id,'aiSpeed',{speed:'fast'},2000));
 assert.throws(()=>act(r,r.host,'aiSpeed',{speed:'instant'},2000));
 act(r,r.host,'aiSpeed',{speed:'fast'},2000);assert.equal(r.players[0].ready,false);
 r.players.forEach(p=>p.ready=true);start(r,3000);r.players.forEach((p,i)=>p.role=PRESETS.quick.roles[i]);
 assert.equal(r.nightSeconds,8);assert.equal(view(r,r.host,3000).aiSpeed,'fast');
 assert.throws(()=>act(r,r.host,'aiSpeed',{speed:'normal'},4000));
 tick(r,13000);assert.equal(r.phase,'nightWolf');assert.equal(r.deadline-r.phaseStarted,8000);
 tick(r,14000);assert.ok(r.choices[r.players[1].id]);assert.equal(r.phase,'nightWolf');
 tick(r,20999);assert.equal(r.phase,'nightWolf');tick(r,21000);assert.equal(r.phase,'nightWitch');assert.equal(r.deadline-r.phaseStarted,8000);
 // A dead special role still consumes the same fixed phase duration.
 r.players.find(p=>p.role==='witch').alive=false;tick(r,22000);assert.equal(r.phase,'nightWitch');tick(r,29000);assert.equal(r.phase,'nightSeer');
 r.queue=[r.players[1].id,r.host];r.phase='speech';r.phaseStarted=30000;r.deadline=60000;r.choices={};
 tick(r,30999);assert.equal(r.queue[0],r.players[1].id);tick(r,31000);assert.equal(r.queue[0],r.host);assert.equal(r.deadline,61000);
 act(r,r.host,'endSpeech',{},32000);assert.equal(r.phase,'vote');assert.equal(r.deadline,62000);
 r.phase='finished';act(r,r.host,'rematch',{},63000);assert.equal(r.aiSpeed,'fast');
 // Choosing Fast never shortens an all-human match.
 r.players.forEach(p=>{p.bot=false;p.ready=true;});start(r,64000);assert.equal(r.nightSeconds,15);
 delete r.aiSpeed;assert.equal(view(r,r.host,64000).aiSpeed,'normal');
}
fs.rmSync(out,{recursive:true,force:true});console.log('PASS role privacy, wolf chat, seer checks, witch/guard/hunter interactions, kill priority, PK ballots, victory, 24 complete AI matches and rematch');
