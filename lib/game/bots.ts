import {NONE,type GameView} from './model';
// Bots receive exactly their own sanitized client view, never the room engine.
const seat=(v:GameView,id:string)=>v.players.find(p=>p.id===id)?.seat;
function suspects(v:GameView){
 const scores=new Map(v.players.filter(p=>p.alive&&p.id!==v.you).map(p=>[p.id,0]));
 for(const m of v.messages.filter(m=>m.channel==='public')){
  const accusation=m.text.match(/查验了(\d+)号，是狼人/);
  if(accusation){const p=v.players.find(p=>p.seat===Number(accusation[1]));if(p)scores.set(p.id,(scores.get(p.id)??0)+3);}
 }
 const last=v.ballots.at(-1);
 if(last)for(const vote of last.votes)if(vote.target)scores.set(vote.target,(scores.get(vote.target)??0)+1);
 for(const check of v.checks)scores.set(check.target,check.wolf?100:-100);
 return v.players.filter(p=>p.alive&&p.id!==v.you).sort((a,b)=>(scores.get(b.id)??0)-(scores.get(a.id)??0)||((a.seat+v.day)%v.players.length)-((b.seat+v.day)%v.players.length));
}
export function botAction(v:GameView):string{
 const allowed=(value:string)=>v.options.some(o=>o.value===value);
 if(v.phase==='identity')return 'ack';
 if(v.phase==='nightWolf'){
  const agreed=v.wolfVotes?.find(x=>x.target&&allowed(x.target))?.target;if(agreed)return agreed;
  const prey=v.players.filter(p=>p.alive&&p.role!=='wolf');return prey[(v.day-1)%Math.max(1,prey.length)]?.id??NONE;
 }
 if(v.phase==='nightSeer')return v.options.find(o=>o.value!==NONE&&!v.checks.some(c=>c.target===o.value))?.value??v.options[0]?.value??NONE;
 if(v.phase==='nightGuard'){
  const claimed=v.messages.find(m=>m.text.includes('我是预言家'))?.author;
  return claimed&&allowed(claimed)?claimed:allowed(v.you)?v.you:v.options.find(o=>o.value!==NONE)?.value??NONE;
 }
 if(v.phase==='nightWitch'){
  if(allowed('save'))return 'save';
  const known=v.messages.find(m=>/查验了\d+号，是狼人/.test(m.text));
  const match=known?.text.match(/查验了(\d+)号/);const target=match?v.players.find(p=>p.seat===Number(match[1])):undefined;
  return target&&allowed(`poison:${target.id}`)?`poison:${target.id}`:NONE;
 }
 const ranked=suspects(v).filter(p=>allowed(p.id)&&(v.myRole!=='wolf'||p.role!=='wolf'));
 return ranked[0]?.id??NONE;
}
export function botSpeech(v:GameView):string{
 if(v.phase==='lastWords')return `我的遗言：请对比白天的发言与投票记录，不要只看谁说得肯定。`;
 if(v.myRole==='seer'){
  const c=v.checks.at(-1);return c?`我是预言家。第${c.day}夜查验了${seat(v,c.target)}号，是${c.wolf?'狼人':'好人'}。这是我的查验信息，请结合票型判断。`:'我是预言家，目前没有查验结果。';
 }
 if(v.myRole==='wolf'&&v.players.filter(p=>p.role==='wolf')[0]?.id===v.you){
  const target=suspects(v).find(p=>p.role!=='wolf');return target?`我是预言家。昨夜查验了${target.seat}号，是狼人。我建议大家今天投${target.seat}号。`:'我支持先比较票型再投票。';
 }
 const last=v.ballots.at(-1),own=last?.votes.find(x=>x.voter===v.you);
 const target=suspects(v)[0];
 if(own?.target)return `上一轮我投了${seat(v,own.target)}号。今天我更关注${target?.seat??'?'}号的解释；请大家核对上一轮票型。`;
 if(v.myRole==='witch'&&!v.potions?.save)return '我有用药信息，但现在不准备公开全部身份细节。请两位声称有查验的人说清楚验人顺序。';
 return target?`目前我没有能公开证明身份的信息。我想听${target.seat}号解释自己的判断；这一票会结合查验说法与其他人的发言。`:'我先听大家的发言，再决定投票。';
}
