import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function GET(){const s=readState(); if(s.items.length<2) return NextResponse.json({ready:false,rows:[]}); const rows=s.items.map(it=>{ const id=it.id; const rating=s.globalRatings[id]||1500; const w=s.wins[id]||0; const a=s.appearances[id]||0; const l=a-w; const wp=a>0?Math.round(w/a*100):0; return {id, name:(s.nameOverrides[id]||it.name), rating, w, l, wp} }).sort((x:any,y:any)=>y.rating-x.rating).map((row:any,i:number)=>({rank:i+1, ...row})); return NextResponse.json({ready:true,rows}) }
