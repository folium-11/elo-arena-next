import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function GET(){const s=readState(); if(!s.signInEnabled) return NextResponse.json({enabled:false}); const fp=cookies().get('fp')?.value; const sess=fp?s.activeSessions[fp]:null; if(!sess) return NextResponse.json({enabled:true,signedIn:false,name:null,rows:[]}); const name=sess.name; const map=s.perUserRatings[name]||{}; const rows=Object.keys(map).map(id=>{ const it=s.items.find(x=>x.id===id); if(!it) return null; return { id, name: s.nameOverrides[id]||it.name, rating: map[id] } }).filter(Boolean).sort((a:any,b:any)=>b.rating-a.rating).map((row:any,i:number)=>({ rank:i+1, ...row })); return NextResponse.json({enabled:true,signedIn:true,name,rows}) }
