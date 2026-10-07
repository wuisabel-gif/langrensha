import type {GameView} from './model';
export type Session={code:string;token:string};
export async function requestGame(action:string,session:Session|null,data:Record<string,unknown>={}):Promise<{room:GameView;token?:string}>{
 const response=await fetch(action==='poll'?`/api/game?code=${session?.code}`:'/api/game',{method:action==='poll'?'GET':'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.token}`}:{})},...(action==='poll'?{}:{body:JSON.stringify({action,code:session?.code,...data})})});
 const result=await response.json() as GameView & {room:GameView;token?:string;error?:string};if(!response.ok)throw Error(result.error??'连接中断，请重试。');return action==='poll'?{room:result}:result;
}
