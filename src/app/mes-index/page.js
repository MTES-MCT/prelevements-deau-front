import {redirect} from 'next/navigation'

export const metadata = {title: 'Mes index de prélèvement'}
export const dynamic = 'force-dynamic'

const Page = () => redirect('/mes-declarations#demandes')

export default Page
