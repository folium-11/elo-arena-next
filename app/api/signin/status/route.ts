import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function GET(){const s=readState(); let fp=cookies().get('fp')?.value; if(!fp){ fp=crypto.randomUUID(); cookies().set('fp', fp, { httpOnly:false, sameSite:'lax', path:'/', maxAge:60*60*24*365 }) } const sess=fp?s.activeSessions[fp]:null; return NextResponse.json({enabled:s.signInEnabled, signedIn:!!sess, name:sess?.name||null}) }
