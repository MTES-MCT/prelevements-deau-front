import {withAuth} from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login'
  }
})

export const config = {
  matcher: [
    '/dossiers/:path*',
    '/prelevements/:path*',
    '/preleveurs/:path*',
    '/validateur',
    '/statistiques'
  ]
}
