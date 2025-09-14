import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, ensureItemStats, expectedScore, kFactor, ensurePair, sanitizeItem, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
export async function POST(){ cookies().delete('role'); return NextResponse.json({ok:true}) }
