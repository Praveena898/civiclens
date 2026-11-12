import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents,
} from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { ChevronDown, ChevronUp, Crosshair, Plus, Search, TriangleAlert, X } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { facilitiesApi, incidentsApi, routesApi } from '../services/api'
import { facilityIcon, incidentIcon } from '../maps/icons'
import DetailsPanel from '../components/DetailsPanel'
import FacilityForm from '../components/FacilityForm'
import IncidentForm from '../components/IncidentForm'
import Modal from '../components/Modal'
import { Spinner, inputCls } from '../components/ui'
import {
  FACILITY_CATEGORIES, INCIDENT_STATUSES, MAP_CENTER, MAP_ZOOM, ROUTE_TYPES, SEVERITIES, TILE_ATTR, TILE_URL,
} from '../utils/constants'

// Renders nothing; listens for clicks only while a "pick a location" mode is active.
function MapClicks({ mode, onPick }) {
  useMapEvents({ click: (e) => mode && onPick(e.latlng) })
  return null
}

// Renders nothing; moves the camera when `target` changes. (useMap gives access to the Leaflet map.)
function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target.pos, target.zoom ?? 18, { duration: 0.8 })
  }, [target, map])
  return null
}

const Section = ({ title, children }) => (
  <div className="border-t border-slate-100 px-3 py-3 first:border-t-0">
    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
    {children}
  </div>
)

export default function MapExplorer() {
  const [visibleCats, setVisibleCats] = useState(() =>
    Object.fromEntries(Object.keys(FACILITY_CATEGORIES).map((k) => [k, true])))
  const [showRoutes, setShowRoutes] = useState(true)
  const [showIncidents, setShowIncidents] = useState(true)
  const [sevFilter, setSevFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const [selected, setSelected] = useState(null)   // { kind, id }
  const [pickMode, setPickMode] = useState(null)   // 'facility' | 'incident' | null
  const [formModal, setFormModal] = useState(null) // { kind, location?, item? }
  const [flyTarget, setFlyTarget] = useState(null)

  // Data from the backend. Polling keeps the map fresh until WebSockets are added.
  const facilities = useAsync(() => facilitiesApi.list({ limit: 1000 }), [], { interval: 20000 })
  const incidents = useAsync(
    () => incidentsApi.list({ severity: sevFilter, status: statusFilter, limit: 500 }),
    [sevFilter, statusFilter],
    { interval: 10000 },
  )
  const routes = useAsync(routesApi.list, [])

  const counts = useMemo(() => {
    const c = {}
    facilities.data?.forEach((f) => { c[f.category] = (c[f.category] ?? 0) + 1 })
    return c
  }, [facilities.data])

  const shownFacilities = useMemo(
    () => (facilities.data ?? []).filter((f) => visibleCats[f.category]),
    [facilities.data, visibleCats],
  )

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return (facilities.data ?? [])
      .filter((f) => `${f.name} ${f.area ?? ''}`.toLowerCase().includes(q))
      .slice(0, 6)
  }, [search, facilities.data])

  // Look the selection up in the fresh lists so edits/status changes show immediately.
  const selectedItem = useMemo(() => {
    if (!selected) return null
    const list = { facility: facilities.data, incident: incidents.data, route: routes.data }[selected.kind]
    return list?.find((x) => x.id === selected.id) ?? null
  }, [selected, facilities.data, incidents.data, routes.data])

  const reloadPoints = () => { facilities.reload(); incidents.reload() }
  const focus = (item) => setFlyTarget({ pos: [item.latitude, item.longitude], key: Date.now() })
  const select = (kind, id) => setSelected({ kind, id })

  function focusFacility(f) {
    select('facility', f.id)
    focus(f)
  }

  function handleSaved(kind, item) {
    setFormModal(null)
    if (kind === 'facility') setVisibleCats((v) => ({ ...v, [item.category]: true }))
    reloadPoints()
    select(kind, item.id)
    focus(item)
  }

  const routeColor = (r) => ROUTE_TYPES[r.route_type]?.color ?? '#0d9488'
  const selRoute = selected?.kind === 'route' ? selectedItem : null
  const ringPos = selectedItem && selected.kind !== 'route' ? [selectedItem.latitude, selectedItem.longitude] : null

  return (
    <div className="relative h-full w-full">
      <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} zoomControl={false} className={`h-full w-full ${pickMode ? 'picking' : ''}`}>
        <TileLayer attribution={TILE_ATTR} url={TILE_URL} maxZoom={19} />
        <ZoomControl position="bottomleft" />
        <MapClicks mode={pickMode} onPick={(ll) => { setFormModal({ kind: pickMode, location: { lat: ll.lat, lon: ll.lng } }); setPickMode(null) }} />
        <FlyTo target={flyTarget} />

        {/* Routes: LineStrings drawn as polylines. Walking = dashed teal, vehicle = solid orange. */}
        {showRoutes && routes.data?.map((r) => (
          <Polyline
            key={r.id}
            positions={r.coordinates}
            pathOptions={{
              color: routeColor(r), weight: selRoute?.id === r.id ? 8 : 5, opacity: 0.85,
              dashArray: ROUTE_TYPES[r.route_type]?.dash ?? undefined,
            }}
            eventHandlers={{ click: () => select('route', r.id) }}
          >
            <Tooltip sticky>{r.name}</Tooltip>
          </Polyline>
        ))}
        {selRoute && (
          <>
            <CircleMarker center={selRoute.coordinates[0]} radius={8} pathOptions={{ color: '#fff', fillColor: '#16a34a', fillOpacity: 1, weight: 3 }}>
              <Tooltip permanent direction="top">Start</Tooltip>
            </CircleMarker>
            <CircleMarker center={selRoute.coordinates.at(-1)} radius={8} pathOptions={{ color: '#fff', fillColor: '#dc2626', fillOpacity: 1, weight: 3 }}>
              <Tooltip permanent direction="top">End</Tooltip>
            </CircleMarker>
          </>
        )}

        {/* Facilities: Points, clustered when zoomed out. The key remounts the group when toggles change. */}
        <MarkerClusterGroup
          key={Object.keys(visibleCats).filter((k) => visibleCats[k]).join(',')}
          chunkedLoading
          maxClusterRadius={45}
        >
          {shownFacilities.map((f) => (
            <Marker
              key={f.id}
              position={[f.latitude, f.longitude]}
              icon={facilityIcon(f.category, f.status)}
              eventHandlers={{ click: () => select('facility', f.id) }}
            >
              <Tooltip direction="top" offset={[0, -14]}>{f.name}</Tooltip>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {/* Incidents: few and important, so never clustered. */}
        {showIncidents && incidents.data?.map((i) => (
          <Marker
            key={i.id}
            position={[i.latitude, i.longitude]}
            icon={incidentIcon(i.severity, i.status)}
            zIndexOffset={1000}
            eventHandlers={{ click: () => select('incident', i.id) }}
          >
            <Tooltip direction="top" offset={[0, -16]}>{i.title}</Tooltip>
          </Marker>
        ))}

        {ringPos && (
          <CircleMarker center={ringPos} radius={24} interactive={false} pathOptions={{ color: '#14b8a6', weight: 3, fill: false }} />
        )}
      </MapContainer>

      {/* Pick-mode banner */}
      {pickMode && (
        <div className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-full bg-navy-900 px-4 py-2 text-sm text-white shadow-lg">
          <Crosshair size={16} className="text-teal-400" />
          Click the map to place the {pickMode === 'incident' ? 'incident' : 'facility'}
          <button onClick={() => setPickMode(null)} className="rounded-full bg-white/10 p-1 hover:bg-white/20"><X size={14} /></button>
        </div>
      )}

      {/* Loading / error overlays */}
      {(facilities.loading && !facilities.data) && (
        <div className="absolute left-1/2 top-16 z-[1000] -translate-x-1/2 rounded-lg bg-white px-3 py-2 text-sm shadow">
          <span className="flex items-center gap-2 text-slate-600"><Spinner className="h-4 w-4" /> Loading map data…</span>
        </div>
      )}
      {(facilities.error || routes.error || incidents.error) && (
        <div className="absolute bottom-10 left-1/2 z-[1000] -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 shadow">
          {facilities.error || routes.error || incidents.error}
          <button className="ml-3 font-medium underline" onClick={() => { facilities.reload(); incidents.reload(); routes.reload() }}>Retry</button>
        </div>
      )}

      {/* Left control panel */}
      <div className="absolute left-3 top-3 z-[1000] w-72 max-w-[calc(100%-1.5rem)] rounded-xl border border-slate-200 bg-white shadow-xl">
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-semibold text-slate-800"
        >
          Layers &amp; filters
          {panelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {panelOpen && (
          <div className="max-h-[calc(100vh-14rem)] overflow-y-auto border-t border-slate-100">
            <Section title="Search facilities">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                <input className={`${inputCls} pl-8`} placeholder="Name or zone…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {results.length > 0 && (
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {results.map((f) => (
                    <li key={f.id}>
                      <button className="w-full px-2.5 py-1.5 text-left text-sm hover:bg-slate-50" onClick={() => { focusFacility(f); setSearch('') }}>
                        {f.name}
                        <span className="block text-xs text-slate-500">{FACILITY_CATEGORIES[f.category]?.label} · {f.area ?? '–'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {search.trim() && results.length === 0 && <p className="mt-2 text-xs text-slate-500">No facility matches “{search}”.</p>}
            </Section>

            <Section title="Create on map">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPickMode('facility')}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-2 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  <Plus size={14} /> Facility
                </button>
                <button
                  onClick={() => setPickMode('incident')}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-2 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <TriangleAlert size={14} /> Incident
                </button>
              </div>
            </Section>

            <Section title="Facility layers (legend)">
              <div className="space-y-1">
                {Object.entries(FACILITY_CATEGORIES).map(([key, c]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox" className="accent-teal-600" checked={visibleCats[key]}
                      onChange={() => setVisibleCats((v) => ({ ...v, [key]: !v[key] }))}
                    />
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: c.color }}>
                      <c.icon size={11} />
                    </span>
                    <span className="flex-1 text-slate-700">{c.label}</span>
                    <span className="text-xs text-slate-400">{counts[key] ?? 0}</span>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Routes">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="accent-teal-600" checked={showRoutes} onChange={() => setShowRoutes((s) => !s)} />
                Show routes ({routes.data?.length ?? 0})
              </label>
              <div className="mt-2 space-y-1 text-xs text-slate-500">
                {Object.values(ROUTE_TYPES).map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <svg width="28" height="6"><line x1="0" y1="3" x2="28" y2="3" stroke={t.color} strokeWidth="4" strokeDasharray={t.dash ?? undefined} /></svg>
                    {t.label}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Incidents">
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="accent-teal-600" checked={showIncidents} onChange={() => setShowIncidents((s) => !s)} />
                Show incidents ({incidents.data?.length ?? 0})
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select className={inputCls} value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
                  <option value="">All severities</option>
                  {Object.entries(SEVERITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {Object.entries(INCIDENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                {Object.values(SEVERITIES).map((s) => (
                  <span key={s.label} className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
                  </span>
                ))}
              </div>
            </Section>

            {facilities.data?.some((f) => f.is_simulated) && (
              <p className="border-t border-slate-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Part of this data is <b>simulated demo data</b> for a fictional festival ground.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right details panel */}
      {selectedItem && (
        <DetailsPanel
          key={`${selected.kind}-${selected.id}`}
          kind={selected.kind}
          item={selectedItem}
          onClose={() => setSelected(null)}
          onEdit={() => setFormModal({ kind: selected.kind, item: selectedItem })}
          onChanged={reloadPoints}
          onFocusFacility={focusFacility}
        />
      )}

      {/* Create / edit modals */}
      {formModal?.kind === 'facility' && (
        <Modal wide title={formModal.item ? 'Edit facility' : 'Add facility'} onClose={() => setFormModal(null)}>
          <FacilityForm
            facility={formModal.item}
            initialLocation={formModal.location}
            onSaved={(f) => handleSaved('facility', f)}
            onCancel={() => setFormModal(null)}
          />
        </Modal>
      )}
      {formModal?.kind === 'incident' && (
        <Modal wide title={formModal.item ? 'Edit incident' : 'Report incident'} onClose={() => setFormModal(null)}>
          <IncidentForm
            incident={formModal.item}
            initialLocation={formModal.location}
            onSaved={(i) => handleSaved('incident', i)}
            onCancel={() => setFormModal(null)}
          />
        </Modal>
      )}
    </div>
  )
}