import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function GET(){const s=readState(); const c=cookies(); const fp=c.get('fp')?.value; const rc=c.get('role')?.value; let role:'none'|'admin'|'super_admin'|'oj_holder'='none'; if(s.ojLock.holder&&fp&&s.ojLock.holder===fp) role='oj_holder'; else if(rc==='super_admin') role='super_admin'; else if(rc==='admin') role='admin'; return NextResponse.json({role}) }
