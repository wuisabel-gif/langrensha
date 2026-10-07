import {ROLES,type Role} from '../../lib/game/model';
// Crop the atlas in its native square coordinates; slice preserves portrait proportions.
export function RoleArt({role,className=''}:{role:Role;className?:string}){
 const index=ROLES[role].art;
 return <div role="img" aria-label={`${ROLES[role].name}角色插画`} className={`role-art ${className}`}>
  <svg viewBox={`${(index%3)*512} ${Math.floor(index/3)*512} 512 512`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
   <image href="/roles-atlas.png" width="1536" height="1024"/>
  </svg>
 </div>;
}
export function MaskedArt(){
 return <img className="masked-art" src="/masked-guest.png" alt="戴面具的神秘来客，身份未知"/>;
}
export function RoleCard({role,hidden=false}:{role?:Role;hidden?:boolean}){
 if(!role||hidden)return <div className="role-card card-back"><MaskedArt/><div className="masked-card-copy"><span>秘密身份</span><p>只有你能翻开这张牌</p></div></div>;
 const info=ROLES[role];return <div className={`role-card ${role==='wolf'?'wolf-card':''}`}><RoleArt role={role}/><div className="role-card-copy"><span className="role-team">{info.team}</span><h2>{info.name}</h2><p>{info.ability}</p></div></div>;
}
