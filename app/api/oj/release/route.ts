import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function POST(){const s=readState(); const c=cookies(); const fp=c.get('fp')?.value; const rc=c.get('role')?.value; if(rc!=='super_admin' && !(s.ojLock.holder&&fp&&s.ojLock.holder===fp)) return new NextResponse('forbidden',{status:403}); s.ojLock.holder=null; s.ojLock.since=null; writeState(s); return NextResponse.json({ok:true}) }
