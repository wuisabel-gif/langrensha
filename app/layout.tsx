import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'夜幕 · 狼人杀',description:'与朋友在线进行中文狼人杀。秘密身份、夜间行动、发言与投票。',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
