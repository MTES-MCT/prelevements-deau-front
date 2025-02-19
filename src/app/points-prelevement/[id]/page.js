import {redirect} from 'next/navigation'

export default function Page({params}) {
  redirect(`/points-prelevement/${params.id}/identification`)
}
