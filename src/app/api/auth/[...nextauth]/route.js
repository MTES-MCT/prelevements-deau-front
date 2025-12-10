import NextAuth from 'next-auth'

import {authOptions} from '@/server/auth.js'

const handler = NextAuth.default(authOptions)
export {handler as GET, handler as POST}
