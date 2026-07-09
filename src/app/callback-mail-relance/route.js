import {NextResponse} from 'next/server'

export function GET(request) {
  return NextResponse.redirect(new URL('/mes-declarations/new', request.url), 307)
}
