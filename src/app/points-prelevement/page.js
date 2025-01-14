import MapContainer from '@/components/map/map-container.js'

const Page = async () => {
  const response = await fetch('http://localhost:5000/api/points-prelevement')
  const points = await response.json()

  return (
    <MapContainer points={points} />
  )
}

export default Page
