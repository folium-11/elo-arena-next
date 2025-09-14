import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function GET(){const s=readState(); const c=cookies(); let fp=c.get('fp')?.value; if(!fp){ fp=crypto.randomUUID(); cookies().set('fp', fp, { httpOnly:false, sameSite:'lax', path:'/', maxAge:60*60*24*365 }) } const p=ensurePair(s,fp||undefined); if(!p) return NextResponse.json({pair:null}); const a=s.items.find(x=>x.id===p[0])!; const b=s.items.find(x=>x.id===p[1])!; return NextResponse.json({pair:[sanitizeItem(s,a), sanitizeItem(s,b)]}) }
