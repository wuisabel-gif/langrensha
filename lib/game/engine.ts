import {PRESETS, NONE, type Room, type Player, type Phase, type Role, type GameView, type Death} from './model';
import {botAction,botSpeech} from './bots';
const id=()=>crypto.randomUUID();
export const alive=(r:Room)=>r.players.filter(p=>p.alive);
const player=(r:Room,pid:string)=>r.players.find(p=>p.id===pid);
const label=(r:Room,pid:string)=>{const i=r.players.findIndex(p=>p.id===pid);return i<0?'空票':`${i+1}号 ${r.players[i].name}`;};
const log=(r:Room,text:string)=>r.logs.push({id:id(),day:r.day,text});
function phase(r:Room,next:Phase,now:number,seconds:number){r.phase=next;r.phaseStarted=now;r.deadline=now+seconds*1000;r.choices={};}
export function createRoom(code:string,name:string,token:string,now:number):Room{
 const p:Player={id:id(),token,name,bot:false,ready:false,alive:true,lastChat:0};
 return {code,host:p.id,preset:'quick',players:[p],spectators:[],phase:'lobby',day:0,deadline:0,phaseStarted:now,created:now,speechSeconds:30,nightSeconds:15,choices:{},night:{},potions:{save:true,poison:true},checks:{},logs:[],messages:[],ballots:[],queue:[],tied:[],pk:false,deaths:[],hunters:[],words:[],afterDeaths:'day',publicRoles:{}};
}
export function joinRoom(r:Room,name:string,token:string){
 if([...r.players,...r.spectators].some(p=>p.name===name))throw Error('这个名字已被使用。');
 const p:Player={id:id(),token,name,bot:false,ready:false,alive:true,lastChat:0};
 if(r.phase==='lobby'&&r.players.length<PRESETS[r.preset].size)r.players.push(p);
 else {if(r.spectators.length>=20)throw Error('观战席已满。');r.spectators.push(p);}
 if(!r.host)r.host=p.id;return p;
}
export function addBot(r:Room){
 if(r.players.length>=PRESETS[r.preset].size)throw Error('座位已满。');
 const names=['月白','青岚','雾弥','星野','川遥','凛','南枝','弦月','墨羽','千秋','知更'];
 const name=names.find(n=>![...r.players,...r.spectators].some(p=>p.name===n))??`旅人${r.players.length+1}`;
 r.players.push({id:id(),token:id(),name,bot:true,ready:true,alive:true,lastChat:0});
}
export function start(r:Room,now:number){
 const roles:Role[]=[...PRESETS[r.preset].roles];
 for(let i=roles.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[roles[i],roles[j]]=[roles[j],roles[i]];}
 r.players.forEach((p,i)=>{p.role=roles[i];p.alive=true;});r.day=1;
 log(r,`${PRESETS[r.preset].name}开始。身份已秘密分配。`);phase(r,'identity',now,10);
}
function finish(r:Room,winner:Room['winner'],reason:string){r.winner=winner;r.winReason=reason;r.phase='finished';r.deadline=0;r.choices={};log(r,reason);}
export function checkWin(r:Room):boolean{
 const live=alive(r),wolves=live.filter(p=>p.role==='wolf'),good=live.filter(p=>p.role!=='wolf');
 if(!wolves.length){finish(r,'good','所有狼人出局，好人阵营获胜。');return true;}
 const rule=PRESETS[r.preset].victory;
 if(!good.length||(rule==='parity'&&wolves.length>=good.length)||(rule==='edge'&&(!good.some(p=>p.role==='villager')||!good.some(p=>p.role!=='villager')))){
  finish(r,'wolves',rule==='parity'?'狼人数量达到好人数量，狼人阵营获胜。':rule==='edge'?'村民或神职已全部出局，狼人阵营获胜。':'所有好人出局，狼人阵营获胜。');return true;
 }return false;
}
function beginNight(r:Room,now:number){
 r.night={};r.pk=false;r.tied=[];r.queue=[];
 if(r.day>12){finish(r,'draw','已完成 12 个昼夜，仍未分出胜负，本局平局。');return;}
 log(r,`第 ${r.day} 夜，天黑请闭眼。`);
 phase(r,r.preset==='guard'?'nightGuard':'nightWolf',now,r.nightSeconds);
}
function kill(r:Room,pid:string|undefined,cause:Death['cause']){
 const p=pid?player(r,pid):undefined;if(!p?.alive)return;
 p.alive=false;r.deaths.push({id:p.id,cause});
 if(p.role==='hunter'&&cause!=='poison'&&!r.hunters.includes(p.id))r.hunters.push(p.id);
 if(r.afterDeaths==='night'||r.day===1)r.words.push(p.id);
}
function beginSpeech(r:Room,now:number,ids?:string[]){
 r.queue=ids??alive(r).map(p=>p.id);
 if(!r.pk&&r.day%2===0)r.queue.reverse();
 phase(r,'speech',now,r.speechSeconds);
}
function afterDeathActions(r:Room,now:number){
 if(checkWin(r))return;
 if(r.hunters.length){r.publicRoles[r.hunters[0]]='hunter';phase(r,'hunter',now,20);return;}
 if(r.words.length){phase(r,'lastWords',now,r.speechSeconds);return;}
 if(r.afterDeaths==='day')beginSpeech(r,now);else {r.day++;beginNight(r,now);}
}
export function resolveNight(r:Room,now:number){
 r.deaths=[];r.hunters=[];r.words=[];r.afterDeaths='day';
 const guarded=r.night.guard===r.night.kill,saved=!!r.night.save;
 if(r.night.kill&&guarded===saved)kill(r,r.night.kill,'wolf');
 // Wolf-kill priority: an already achieved wolf victory precedes poison/shot.
 if(checkWin(r))return;
 const poisoned=r.night.poison;
 if(poisoned){r.hunters=r.hunters.filter(x=>x!==poisoned);kill(r,poisoned,'poison');}
 if(checkWin(r))return;
 log(r,r.deaths.length?`天亮了。${r.deaths.map(d=>label(r,d.id)).join('、')}出局。`:'天亮了。昨夜无人出局。');
 phase(r,'dawn',now,8);
}
function eligibleVoters(r:Room){return alive(r).filter(p=>!r.pk||!r.tied.includes(p.id));}
export function resolveVote(r:Room,now:number){
 const votes=eligibleVoters(r).map(p=>({voter:p.id,target:r.choices[p.id]&&r.choices[p.id]!==NONE?r.choices[p.id]:null}));
 const counts=new Map<string,number>();for(const v of votes)if(v.target)counts.set(v.target,(counts.get(v.target)??0)+1);
 const highest=Math.max(0,...counts.values()),ties=[...counts].filter(([,n])=>n===highest).map(([pid])=>pid);
 const eliminated=ties.length===1?ties[0]:null;
 r.ballots.push({day:r.day,pk:r.pk,votes,eliminated});
 if(!eliminated&&ties.length>1&&!r.pk){r.pk=true;r.tied=ties;log(r,`投票平票：${ties.map(x=>label(r,x)).join('、')}进入 PK 发言。`);beginSpeech(r,now,ties);return;}
 if(!eliminated){log(r,'本轮无人被放逐。');r.day++;beginNight(r,now);return;}
 r.deaths=[];r.hunters=[];r.words=[];r.afterDeaths='night';kill(r,eliminated,'vote');log(r,`${label(r,eliminated)}被放逐。`);afterDeathActions(r,now);
}
export function options(r:Room,pid:string):{value:string;label:string}[]{
 const p=player(r,pid);if(!p)return [];
 const targets=alive(r).map(x=>({value:x.id,label:label(r,x.id)})),skip={value:NONE,label:'不使用 / 跳过'};
 if(r.phase==='identity')return [{value:'ack',label:'我已确认身份'}];
 if(r.phase==='hunter'&&r.hunters[0]===pid)return [...targets,skip];
 if(!p.alive)return [];
 if(r.phase==='nightGuard'&&p.role==='guard')return [...targets.filter(t=>t.value!==r.lastGuard),skip];
 if(r.phase==='nightWolf'&&p.role==='wolf')return [...targets,{value:NONE,label:'空刀'}];
 if(r.phase==='nightSeer'&&p.role==='seer')return [...targets.filter(t=>t.value!==pid),skip];
 if(r.phase==='nightWitch'&&p.role==='witch')return [...(r.potions.save&&r.night.kill&&r.night.kill!==pid?[{value:'save',label:`使用解药 · 救 ${label(r,r.night.kill)}`}]:[]),...(r.potions.poison?targets.map(t=>({value:`poison:${t.value}`,label:`使用毒药 · ${t.label}`})):[]),skip];
 if(r.phase==='vote'&&(!r.pk||!r.tied.includes(pid)))return [...targets.filter(t=>t.value!==pid&&(!r.pk||r.tied.includes(t.value))),{value:NONE,label:'弃票'}];
 return [];
}
export function view(r:Room,pid:string,now:number):GameView{
 const me=player(r,pid),wolves=me?.role==='wolf',privateWolf=!!(wolves&&me?.alive&&r.phase==='nightWolf');
 const speaker=r.phase==='speech'?r.queue[0]:r.phase==='lastWords'?r.words[0]:undefined;
 const canChat=!!me&&(r.phase==='lobby'||speaker===pid||privateWolf);
 return {code:r.code,host:r.host,preset:r.preset,players:r.players.map((p,i)=>({id:p.id,name:p.name,bot:p.bot,ready:p.ready,alive:p.alive,seat:i+1,role:r.phase==='finished'||p.id===pid||wolves&&p.role==='wolf'?p.role:r.publicRoles[p.id]})),spectators:r.spectators.map(p=>({id:p.id,name:p.name})),phase:r.phase,day:r.day,deadline:r.deadline,serverNow:now,you:pid,isSpectator:!me,myRole:me?.role,myAlive:!!me?.alive,myChoice:r.choices[pid],checks:r.checks[pid]??[],...(me?.role==='witch'?{potions:r.potions,...(r.potions.save&&r.phase==='nightWitch'?{wolfTarget:r.night.kill}: {})}:{}),...(privateWolf?{wolfVotes:alive(r).filter(p=>p.role==='wolf').map(p=>({name:p.name,target:r.choices[p.id]??''}))}:{}),options:options(r,pid),canAct:options(r,pid).length>0&&!r.choices[pid],canChat,chatChannel:privateWolf?'wolves':'public',speaker,logs:r.logs.slice(-80),messages:r.messages.filter(m=>m.channel==='public'||wolves).slice(-120),ballots:r.ballots,pk:r.pk,tied:r.tied,winner:r.winner,winReason:r.winReason,speechSeconds:r.speechSeconds,nightSeconds:r.nightSeconds};
}
function endSpeech(r:Room,now:number){r.queue.shift();if(r.queue.length)phase(r,'speech',now,r.speechSeconds);else phase(r,'vote',now,30);}
export function act(r:Room,pid:string,action:string,data:Record<string,unknown>,now:number){
 const p=player(r,pid),spectator=r.spectators.find(p=>p.id===pid);
 if(!p&&!spectator)throw Error('身份验证失效，请重新加入。');
 if(action==='leave'){
  if(p&&r.phase!=='lobby'&&r.phase!=='finished')throw Error('本局结束后可以离开座位。');
  r.players=r.players.filter(p=>p.id!==pid);r.spectators=r.spectators.filter(p=>p.id!==pid);
  if(r.host===pid)r.host=r.players.find(p=>!p.bot)?.id??r.spectators[0]?.id??'';return;
 }
 if(action==='rematch'){
  if(pid!==r.host||r.phase!=='finished')throw Error('只有房主能在结束后开始下一局。');
  const old=[...r.players,...r.spectators],humans=old.filter(p=>!p.bot),size=PRESETS[r.preset].size;
  const fresh=createRoom(r.code,humans[0]?.name??'房主',humans[0]?.token??id(),r.created);
  Object.assign(r,fresh,{winner:undefined,winReason:undefined,lastGuard:undefined,host:pid,preset:r.preset,speechSeconds:r.speechSeconds,nightSeconds:r.nightSeconds,players:[...humans,...old.filter(p=>p.bot)].slice(0,size).map(p=>({...p,role:undefined,alive:true,ready:p.bot})),spectators:humans.slice(size)});return;
 }
 if(!p)throw Error('你正在观战，下局有空位时会自动入座。');
 if(action==='ready'&&r.phase==='lobby'){p.ready=!p.ready;return;}
 if(['preset','fill','removeBot','settings','start'].includes(action)){
  if(pid!==r.host||r.phase!=='lobby')throw Error('只有房主可以在等待室设置。');
  if(action==='preset'){
   if(typeof data.preset!=='string'||!(data.preset in PRESETS))throw Error('请选择有效的配置。');
   const key=data.preset as Room['preset'];if(r.players.length>PRESETS[key].size)throw Error('请先移除多余 AI 座位。');r.preset=key;r.players.forEach(p=>p.ready=p.bot);
  }else if(action==='fill'){while(r.players.length<PRESETS[r.preset].size)addBot(r);}
  else if(action==='removeBot'){r.players=r.players.filter(p=>!p.bot||p.id!==data.playerId);}
  else if(action==='settings'){
   if(![20,30,45,60].includes(Number(data.seconds)))throw Error('请选择 20、30、45 或 60 秒。');r.speechSeconds=Number(data.seconds);r.players.forEach(p=>p.ready=p.bot);
  }else{if(r.players.length!==PRESETS[r.preset].size||!r.players.every(p=>p.ready))throw Error('请补齐人数，并等待所有人准备。');start(r,now);}return;
 }
 if(action==='choice'){
  if(r.choices[pid])throw Error('本阶段的选择已确认。');
  const value=String(data.value??'');if(!options(r,pid).some(o=>o.value===value))throw Error('此时不能执行这项行动。');
  r.choices[pid]=value;
  if(r.phase==='nightSeer'&&value!==NONE)(r.checks[pid]??=[]).push({day:r.day,target:value,wolf:player(r,value)?.role==='wolf'});
  if(r.phase==='vote'&&eligibleVoters(r).every(p=>r.choices[p.id]))resolveVote(r,now);
  if(r.phase==='hunter')resolveHunter(r,now);
  return;
 }
 if(action==='chat'){
  const v=view(r,pid,now);if(!v.canChat)throw Error('请等待你的发言轮次。');
  const text=typeof data.text==='string'?data.text.trim().slice(0,400):'';if(!text)throw Error('请先输入内容。');if(now-p.lastChat<800)throw Error('请稍后再发送。');
  r.messages.push({id:id(),author:pid,name:p.name,text,channel:v.chatChannel,at:now,day:r.day});r.messages=r.messages.slice(-200);p.lastChat=now;return;
 }
 if(action==='endSpeech'){
  if(r.phase==='speech'&&r.queue[0]===pid){endSpeech(r,now);return;}
  if(r.phase==='lastWords'&&r.words[0]===pid){r.words.shift();afterDeathActions(r,now);return;}
 }
 throw Error('当前阶段不能执行此操作。');
}
function resolveHunter(r:Room,now:number){
 const shooter=r.hunters.shift()!,target=r.choices[shooter];
 if(target&&target!==NONE){kill(r,target,'shot');log(r,`${label(r,shooter)}发动猎人技能，${label(r,target)}出局。`);}else log(r,`${label(r,shooter)}放弃开枪。`);
 afterDeathActions(r,now);
}
function advance(r:Room,now:number){
 switch(r.phase){
  case 'identity':beginNight(r,now);break;
  case 'nightGuard':{const g=alive(r).find(p=>p.role==='guard'),v=g?r.choices[g.id]:undefined;r.night.guard=v&&v!==NONE?v:undefined;r.lastGuard=r.night.guard;phase(r,'nightWolf',now,r.nightSeconds);break;}
  case 'nightWolf':{const votes=alive(r).filter(p=>p.role==='wolf').map(p=>r.choices[p.id]??NONE);r.night.kill=votes.length&&votes.every(v=>v===votes[0])&&votes[0]!==NONE?votes[0]:undefined;phase(r,'nightWitch',now,r.nightSeconds);break;}
  case 'nightWitch':{const w=alive(r).find(p=>p.role==='witch'),v=w?r.choices[w.id]:undefined;if(v==='save'){r.night.save=true;r.potions.save=false;}if(v?.startsWith('poison:')){r.night.poison=v.slice(7);r.potions.poison=false;}phase(r,'nightSeer',now,r.nightSeconds);break;}
  case 'nightSeer':resolveNight(r,now);break;
  case 'dawn':afterDeathActions(r,now);break;
  case 'speech':endSpeech(r,now);break;
  case 'vote':resolveVote(r,now);break;
  case 'hunter':resolveHunter(r,now);break;
  case 'lastWords':r.words.shift();afterDeathActions(r,now);break;
 }
}
export function tick(r:Room,now:number){
 if(r.phase==='lobby'||r.phase==='finished')return;
 for(const p of r.players.filter(p=>p.bot)){
  const v=view(r,p.id,now),elapsed=now-r.phaseStarted;
  if((r.phase==='speech'||r.phase==='lastWords')&&v.speaker===p.id&&elapsed>=2500){act(r,p.id,'chat',{text:botSpeech(v)},now);act(r,p.id,'endSpeech',{},now);break;}
  if(v.canAct&&elapsed>=2500){act(r,p.id,'choice',{value:botAction(v)},now);}
 }
 if(!(['finished','lobby'] as Phase[]).includes(r.phase)&&now>=r.deadline)advance(r,now);
}
