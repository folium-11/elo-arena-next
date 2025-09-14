import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function POST(req:NextRequest){const s=readState(); const rc=cookies().get('role')?.value; if(!(rc==='admin'||rc==='super_admin')) return new NextResponse('forbidden',{status:403}); const {title}=await req.json(); s.arenaTitle=String(title||'Arena').slice(0,120); writeState(s); return NextResponse.json({ok:true}) }
