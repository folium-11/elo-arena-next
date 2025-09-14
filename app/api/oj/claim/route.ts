import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function POST(){const s=readState(); const rc=cookies().get('role')?.value; if(rc!=='super_admin') return new NextResponse('forbidden',{status:403}); if(s.ojLock.holder) return NextResponse.json({error:'locked'},{status:409}); const fp=cookies().get('fp')?.value; if(!fp) return NextResponse.json({error:'no_fp'},{status:400}); s.ojLock.holder=fp; s.ojLock.since=new Date().toISOString(); writeState(s); return NextResponse.json({ok:true, holder:s.ojLock.holder, since:s.ojLock.since}) }
