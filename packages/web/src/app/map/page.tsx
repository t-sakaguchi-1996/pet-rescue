import MapView from '@/components/MapView'
import { fetchPets } from '@/lib/firestore'

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  const pets = await fetchPets({ status: 'searching', limitCount: 200 })

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="bg-white border-b px-4 py-3">
        <h1 className="font-bold text-gray-800">
          迷子ペットマップ
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({pets.length}件表示中)
          </span>
        </h1>
      </div>
      <div className="flex-1">
        <MapView pets={pets} />
      </div>
    </div>
  )
}
