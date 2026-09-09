import {redirect} from 'next/navigation'

export const metadata = {title: 'Mes besoins'}
export const dynamic = 'force-dynamic'

const Page = () => redirect('/mes-declarations#demandes')

export default Page
