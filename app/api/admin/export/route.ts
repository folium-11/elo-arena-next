import { NextResponse } from 'next/server'
import { readState } from '@/lib/state'

export const runtime = 'nodejs'

export async function GET() {
  const s = await readState()
  const body = JSON.stringify(s, null, 2)
  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="arena-export.json"',
      'cache-control': 'no-store',
    },
  })
}


