import {env} from 'cloudflare:workers';
import {act,createRoom,joinRoom,tick,view} from '../../../lib/game/engine';
import type {Room} from '../../../lib/game/model';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const codeOf=(v:unknown)=>typeof v==='string'?v.trim().toUpperCase():'';
function nameOf(v:unknown){const name=typeof v==='string'?v.trim().slice(0,16):'';if(!name)throw Error('请输入昵称。');return name;}
function database(){if(!env.DB)throw Error('暂时无法连接房间，请稍后重试。');return env.DB;}
async function update(code:string,token:string,operation:(r:Room,id:string,now:number)=>void,joinName?:string){
 for(let attempt=0;attempt<8;attempt++){
  const row=await database().prepare('SELECT state, version FROM rooms WHERE code = ?').bind(code).first<{state:string;version:number}>();
  if(!row)throw Error('房间不存在，请检查房间号。');
  const r=JSON.parse(row.state) as Room,now=Date.now();
  if(now-r.created>86400000)throw Error('房间已过期，请创建新房间。');
  let p=[...r.players,...r.spectators].find(p=>p.token===token);
  if(joinName&&!p)p=joinRoom(r,joinName,token);
  if(!p)throw Error('无法验证座位，请重新加入。');
  tick(r,now);operation(r,p.id,now);
  const state=JSON.stringify(r);if(state===row.state)return view(r,p.id,now);
  const saved=await database().prepare('UPDATE rooms SET state = ?, version = version + 1, updated_at = ? WHERE code = ? AND version = ?').bind(state,now,code,row.version).run();
  if(saved.meta.changes)return view(r,p.id,now);
 }
 throw Error('房间繁忙，请重试。');
}
export async function GET(request:Request){
 try {const u=new URL(request.url);return reply(await update(codeOf(u.searchParams.get('code')),request.headers.get('Authorization')?.replace(/^Bearer /,'')??'',()=>{}));}
 catch(e){return reply({error:e instanceof Error?e.message:'读取房间失败。'},400);}
}
export async function POST(request:Request){
 try {
  const data=await request.json() as Record<string,unknown>,action=String(data.action??'');
  if(action==='create'){
   const name=nameOf(data.name),token=crypto.randomUUID(),now=Date.now();
   await database().prepare('DELETE FROM rooms WHERE updated_at < ?').bind(now-86400000).run();
   for(let i=0;i<5;i++){
    const letters='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',code=Array.from(crypto.getRandomValues(new Uint8Array(5)),n=>letters[n%letters.length]).join('');
    const r=createRoom(code,name,token,now);
    const saved=await database().prepare('INSERT OR IGNORE INTO rooms (code, state, version, updated_at) VALUES (?, ?, 0, ?)').bind(code,JSON.stringify(r),now).run();
    if(saved.meta.changes)return reply({room:view(r,r.host,now),token});
   }throw Error('创建失败，请重试。');
  }
  const code=codeOf(data.code);
  if(action==='join'){const token=crypto.randomUUID();return reply({room:await update(code,token,()=>{},nameOf(data.name)),token});}
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'')??'';
  return reply({room:await update(code,token,(r,id,now)=>act(r,id,action,data,now))});
 }catch(e){return reply({error:e instanceof Error?e.message:'操作失败，请重试。'},400);}
}
