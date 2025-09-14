import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function POST(req:NextRequest){const s=readState(); const rc=cookies().get('role')?.value; if(!(rc==='admin'||rc==='super_admin')) return new NextResponse('forbidden',{status:403}); const {id}=await req.json(); if(id){ s.globalRatings[id]=1500; s.wins[id]=0; s.appearances[id]=0; Object.keys(s.perUserRatings).forEach(u=>{ if(s.perUserRatings[u][id]) delete s.perUserRatings[u][id] }) } writeState(s); return NextResponse.json({ok:true}) }
