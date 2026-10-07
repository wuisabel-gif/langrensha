'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {translate,type Language} from './translate';
const LanguageContext=createContext({lang:'zh' as Language,setLanguage:(_lang:Language)=>{},t:(text:string)=>text});
export function LanguageProvider({children}:{children:ReactNode}){
 const [lang,setLang]=useState<Language>('zh');
 useEffect(()=>{const query=new URLSearchParams(location.search).get('lang');const saved=localStorage.getItem('yemu-language');setLang(query==='en'||query==='zh'?query:saved==='en'?'en':'zh');},[]);
 useEffect(()=>{document.documentElement.lang=lang==='en'?'en':'zh-CN';document.title=lang==='en'?'Nightfall · Werewolf':'夜幕 · 狼人杀';},[lang]);
 function setLanguage(next:Language){setLang(next);localStorage.setItem('yemu-language',next);const url=new URL(location.href);url.searchParams.set('lang',next);history.replaceState(null,'',url);}
 return <LanguageContext.Provider value={{lang,setLanguage,t:text=>translate(text,lang)}}>{children}</LanguageContext.Provider>;
}
export const useLanguage=()=>useContext(LanguageContext);
export function LanguageSwitch(){const {lang,setLanguage}=useLanguage();return <select className="language-switch" aria-label="Language / 语言" value={lang} onChange={e=>setLanguage(e.target.value as Language)}><option value="zh">中文</option><option value="en">English</option></select>;}
