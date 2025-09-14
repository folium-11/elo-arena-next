import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function POST(req:NextRequest){const s=readState(); const body=await req.text(); let password=''; try{password=JSON.parse(body).password||''}catch{} let outcome:'invalid'|'admin'|'super_admin'|'oj_holder'='invalid'; if(password&&process.env.SUPER_ADMIN_PASSWORD&&password===process.env.SUPER_ADMIN_PASSWORD) outcome='super_admin'; else if(password&&process.env.ADMIN_PASSWORD&&password===process.env.ADMIN_PASSWORD) outcome='admin'; const c=cookies(); const fp=c.get('fp')?.value; if(s.ojLock.holder&&fp&&s.ojLock.holder===fp) outcome='oj_holder'; if(outcome==='admin'||outcome==='super_admin') cookies().set('role', outcome, { httpOnly:true, sameSite:'lax', path:'/', maxAge:60*60*24*7 }); return NextResponse.json({outcome}) }
