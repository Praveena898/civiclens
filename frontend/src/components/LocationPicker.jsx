import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { pickIcon } from '../maps/icons'
import { MAP_CENTER, TILE_ATTR, TILE_URL } from '../utils/constants'

const round6 = (n) => Math.round(n * 1e6) / 1e6

function Clicker({ onChange }) {
  useMapEvents({ click: (e) => onChange(round6(e.latlng.lat), round6(e.latlng.lng)) })
  return null
}

export default function LocationPicker({ lat, lon, onChange, height = 240 }) {
  const has = lat != null && lon != null
  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-slate-300" style={{ height }}>
        <MapContainer center={has ? [lat, lon] : MAP_CENTER} zoom={has ? 18 : 16} className="picking h-full w-full">
          <TileLayer attribution={TILE_ATTR} url={TILE_URL} maxZoom={19} />
          <Clicker onChange={onChange} />
          {has && (
            <Marker
              position={[lat, lon]}
              icon={pickIcon()}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng()
                  onChange(round6(p.lat), round6(p.lng))
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {has ? `Selected: ${lat.toFixed(6)}, ${lon.toFixed(6)} (drag the pin to adjust)` : 'Click the map to choose a location.'}
      </p>
    </div>
  )
}