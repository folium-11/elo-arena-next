import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function POST(req:NextRequest){const s=readState(); const rc=cookies().get('role')?.value; if(!(rc==='admin'||rc==='super_admin')) return new NextResponse('forbidden',{status:403}); const {id}=await req.json(); s.items=s.items.filter(x=>x.id!==id); delete s.globalRatings[id]; delete s.wins[id]; delete s.appearances[id]; delete s.nameOverrides[id]; Object.keys(s.perUserRatings).forEach(u=>{ if(s.perUserRatings[u][id]) delete s.perUserRatings[u][id] }); Object.keys(s.activePairs).forEach(fp=>{ const p=s.activePairs[fp]; if(p&&(p[0]===id||p[1]===id)) delete s.activePairs[fp] }); writeState(s); return NextResponse.json({ok:true}) }
