
import fs from 'fs'
import path from 'path'

export type Item = { id: string; name: string; imageUrl?: string | null }
export type State = { arenaTitle:string; items:Item[]; globalRatings:Record<string,number>; perUserRatings:Record<string,Record<string,number>>; wins:Record<string,number>; appearances:Record<string,number>; nameOverrides:Record<string,string>; contributions:Record<string,number>; allowedNames:string[]; slotLimits:Record<string,number>; extraSlots:Record<string,number>; activeSessions:Record<string,{name:string;since:string}>; signInEnabled:boolean; activePairs:Record<string,[string,string]> }
export const dataPath = path.join(process.cwd(),'app','data','state.json')
export const uploadsDir = path.join(process.cwd(),'public','uploads')

export function ensureDirs(){ if(!fs.existsSync(path.dirname(dataPath))) fs.mkdirSync(path.dirname(dataPath),{recursive:true}); if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir,{recursive:true}) }
export function readState():State{ ensureDirs(); return JSON.parse(fs.readFileSync(dataPath,'utf-8')) as State }
export function writeState(s:State){ ensureDirs(); fs.writeFileSync(dataPath, JSON.stringify(s,null,2)) }

export function kFactor(){ return 32 }
export function expectedScore(rA:number,rB:number){ return 1/(1+Math.pow(10,(rB-rA)/400)) }
export function ensureItemStats(s:State,id:string){ if(!s.globalRatings[id]) s.globalRatings[id]=1500; if(!s.wins[id]) s.wins[id]=0; if(!s.appearances[id]) s.appearances[id]=0 }
export function sanitizeItem(s:State,it:Item){ const name=s.nameOverrides[it.id]||it.name; return { id:it.id, name, imageUrl: it.imageUrl||null } }
export function ensurePair(s:State,fp:string|undefined){ const ids=s.items.map(x=>x.id); if(!fp||ids.length<2) return null as null|[string,string]; let p=s.activePairs[fp]; if(!p||!ids.includes(p[0])||!ids.includes(p[1])||p[0]===p[1]){ const a=ids[Math.floor(Math.random()*ids.length)]; let b=ids[Math.floor(Math.random()*ids.length)]; while(b===a) b=ids[Math.floor(Math.random()*ids.length)]; p=[a,b]; s.activePairs[fp]=p; writeState(s) } return p }
