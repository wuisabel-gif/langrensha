import ts from 'typescript';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const out=fs.mkdtempSync(path.join(os.tmpdir(),'yemu-i18n-'));
try{
for(const file of ['model','bots','engine'])fs.writeFileSync(path.join(out,file+'.mjs'),ts.transpileModule(fs.readFileSync(`lib/game/${file}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from '([^']+)'/g,"from '$1.mjs'"));
const source=fs.readFileSync('lib/i18n/translate.ts','utf8').replace("import english from './en.json';",'const english = '+fs.readFileSync('lib/i18n/en.json','utf8')+';');fs.writeFileSync(path.join(out,'translate.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {systemText,translate}=await import(path.join(out,'translate.mjs'));const {createRoom,addBot,start,tick,view}=await import(path.join(out,'engine.mjs'));const {PRESETS,ROLES,PHASE_NAMES}=await import(path.join(out,'model.mjs'));
const english=text=>assert(!/\p{Script=Han}/u.test(systemText(text,'en')),text);
for(const role of Object.values(ROLES))for(const key of ['name','team','ability','tip'])english(role[key]);for(const preset of Object.values(PRESETS))for(const key of ['name','description','rule'])english(preset[key]);for(const phase of Object.values(PHASE_NAMES))english(phase);
for(const preset of Object.keys(PRESETS)){
 const r=createRoom('TEST','Player1','secret',1000);r.preset=preset;while(r.players.length<PRESETS[preset].size)addBot(r);r.players.forEach((p,i)=>{p.bot=true;p.ready=true;p.name=`Player${i+1}`;});start(r,2000);let now=2000,steps=0;
 while(r.phase!=='finished'&&steps++<3000){now+=3000;tick(r,now);for(const p of r.players){for(const option of view(r,p.id,now).options)english(option.label);}}
 assert.equal(r.phase,'finished');for(const log of r.logs){english(log.text);assert.equal(systemText(log.text,'zh'),log.text);}for(const m of r.messages)english(m.text);english(r.winReason);
}
assert.equal(systemText('使用解药 · 救 2号 Alice','en'),'Use antidote · Save Seat 2 · Alice');
assert.equal(translate('Unknown text','en'),'Unknown text');
console.log('PASS English role/preset/phase catalogs, action labels, logs, bot dialogue and results across all game presets; Chinese text preserved.');
}finally{fs.rmSync(out,{recursive:true,force:true});}
