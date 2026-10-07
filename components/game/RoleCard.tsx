import {ROLES,type Role} from '../../lib/game/model';
export function RoleArt({role,className=''}:{role:Role;className?:string}){return <div role="img" aria-label={`${ROLES[role].name}角色插画`} className={`role-art art-${ROLES[role].art} ${className}`}/>;}
export function RoleCard({role,hidden=false}:{role?:Role;hidden?:boolean}){
 if(!role||hidden)return <div className="role-card card-back"><div className="moon-mark">☾</div><span>秘密身份</span><p>只有你能翻开这张牌</p></div>;
 const info=ROLES[role];return <div className={`role-card ${role==='wolf'?'wolf-card':''}`}><RoleArt role={role}/><div className="role-card-copy"><span className="role-team">{info.team}</span><h2>{info.name}</h2><p>{info.ability}</p></div></div>;
}
