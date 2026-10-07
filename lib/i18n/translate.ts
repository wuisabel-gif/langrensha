import english from './en.json';
export type Language='zh'|'en';
export function translate(text:string,lang:Language):string{
 if(lang==='zh')return text;
 return (english as Record<string,string>)[text.trim()]??text;
}

const seatLabels=(text:string)=>text.replace(/(^|、)(\d+)号 /g,(_,separator,seat)=>`${separator?', ':''}Seat ${seat} · `);

// Only system-authored text is passed here. Player chat and names remain untouched.
const patterns: Array<[RegExp,(...parts:string[])=>string]> = [
 [/^使用解药 · 救 (.*)$/,target=>`Use antidote · Save ${systemText(target,'en')}`],
 [/^使用毒药 · (.*)$/,target=>`Use poison · ${systemText(target,'en')}`],
 [/^(.*)开始。身份已秘密分配。$/,preset=>`${translate(preset,'en')} started. Roles have been dealt privately.`],
 [/^第 (\d+) 夜，天黑请闭眼。$/,day=>`Night ${day}. Close your eyes.`],
 [/^天亮了。(.*)出局。$/,names=>`Dawn. Eliminated: ${seatLabels(names)}.`],
 [/^投票平票：(.*)进入 PK 发言。$/,names=>`Tied vote: ${seatLabels(names)}. Runoff discussion begins.`],
 [/^(.*)被放逐。$/,name=>`${seatLabels(name)} was voted out.`],
 [/^(.*)发动猎人技能，(.*)出局。$/,(hunter,target)=>`${seatLabels(hunter)} used the Hunter's shot. ${seatLabels(target)} is eliminated.`],
 [/^(.*)放弃开枪。$/,name=>`${seatLabels(name)} declined to shoot.`],
 [/^我是预言家。第(\d+)夜查验了(\d+)号，是(狼人|好人)。这是我的查验信息，请结合票型判断。$/,(day,seat,team)=>`I am the Seer. On night ${day}, I checked seat ${seat}: ${translate(team,'en')}. Compare my claim with the voting record.`],
 [/^我是预言家。昨夜查验了(\d+)号，是狼人。我建议大家今天投(\d+)号。$/,(seat,target)=>`I am the Seer. Last night I checked seat ${seat}: Werewolf. I suggest voting for seat ${target} today.`],
 [/^上一轮我投了(\d+)号。今天我更关注(\d+|\?)号的解释；请大家核对上一轮票型。$/,(own,target)=>`Last round I voted for seat ${own}. Today I want to hear seat ${target}'s explanation. Please check the last voting record.`],
 [/^目前我没有能公开证明身份的信息。我想听(\d+)号解释自己的判断；这一票会结合查验说法与其他人的发言。$/,seat=>`I have no public proof of my role. I want seat ${seat} to explain their reasoning. I will weigh the claimed checks against everyone's statements.`],
 [/^(\d+)号 (.*)$/,(seat,name)=>`Seat ${seat} · ${name}`],
];
export function systemText(text:string,lang:Language):string{
 if(lang==='zh')return text;
 const direct=translate(text,lang);if(direct!==text)return direct;
 for(const [pattern,format] of patterns){const match=text.match(pattern);if(match)return format(...match.slice(1));}
 return text;
}
