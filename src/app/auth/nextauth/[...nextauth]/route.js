import {getAuthOptions} from '@/server/auth.js'

// Create handlers that lazily initialize NextAuth with dynamic imports
// This handles ESM/CJS interop with next-auth v4
async function createHandler() {
  const nextAuthModule = await import('next-auth')
  // Handle potential double-wrapping by webpack
  const createNextAuth = nextAuthModule.default?.default || nextAuthModule.default || nextAuthModule
  const authOptions = await getAuthOptions()
  return createNextAuth(authOptions)
}

export async function GET(request, context) {
  const handler = await createHandler()
  return handler(request, context)
}

export async function POST(request, context) {
  const handler = await createHandler()
  return handler(request, context)
}
