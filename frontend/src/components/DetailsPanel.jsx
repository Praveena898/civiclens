import { MapPin, Pencil, X } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { errorMessage, facilitiesApi, incidentsApi, routesApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Badge, SimulatedBadge, Spinner, inputCls, btnSecondary } from './ui'
import {
  FACILITY_CATEGORIES, FACILITY_STATUSES, INCIDENT_CATEGORIES, INCIDENT_STATUSES, ROUTE_TYPES, SEVERITIES,
} from '../utils/constants'
import { formatDateTime, formatDistance } from '../utils/format'

function Shell({ title, subtitle, onClose, children }) {
  return (
    <aside className="absolute bottom-8 right-3 top-3 z-[1000] flex w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-80">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
    </aside>
  )
}

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-3 py-1 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="text-right font-medium text-slate-800">{children}</span>
  </div>
)

function NearbyList({ state, onPick, empty }) {
  if (state.loading) return <div className="py-2 text-slate-400"><Spinner className="h-4 w-4" /></div>
  if (state.error) return <p className="text-xs text-red-600">{state.error}</p>
  if (!state.data?.length) return <p className="text-xs text-slate-500">{empty}</p>
  return (
    <ul className="divide-y divide-slate-100">
      {state.data.map((f) => {
        const cat = FACILITY_CATEGORIES[f.category] ?? FACILITY_CATEGORIES.other
        return (
          <li key={f.id}>
            <button onClick={() => onPick(f)} className="flex w-full items-center gap-2 py-2 text-left hover:bg-slate-50">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: cat.color }}>
                <cat.icon size={13} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-800">{f.name}</span>
                <span className="text-xs text-slate-500">{cat.label}</span>
              </span>
              <span className="text-xs font-medium text-slate-600">{formatDistance(f.distance_m)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function FacilityDetails({ item, onClose, onEdit, onChanged, onFocusFacility }) {
  const toast = useToast()
  const cat = FACILITY_CATEGORIES[item.category] ?? FACILITY_CATEGORIES.other
  const nearby = useAsync(
    () => facilitiesApi.nearby({ lat: item.latitude, lon: item.longitude, radius: 300, limit: 7 })
      .then((r) => r.filter((x) => x.id !== item.id)),
    [item.id],
  )

  async function changeStatus(e) {
    try {
      await facilitiesApi.update(item.id, { status: e.target.value })
      toast.success('Status updated')
      onChanged()
    } catch (err) { toast.error(errorMessage(err)) }
  }

  return (
    <Shell title={item.name} subtitle={cat.label} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        <Badge tone={FACILITY_STATUSES[item.status]?.tone}>{FACILITY_STATUSES[item.status]?.label}</Badge>
        {item.is_simulated && <SimulatedBadge />}
      </div>
      <div className="divide-y divide-slate-100">
        <Row label="Area">{item.area ?? '–'}</Row>
        <Row label="Capacity">{item.capacity ?? '–'}</Row>
        <Row label="Contact">{item.contact ?? '–'}</Row>
        <Row label="Coordinates">{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Row>
        <Row label="Added">{formatDateTime(item.created_at)}</Row>
      </div>
      {item.description && <p className="text-sm text-slate-600">{item.description}</p>}
      <label className="block text-xs font-medium text-slate-600">
        Update status
        <select className={`${inputCls} mt-1`} value={item.status} onChange={changeStatus}>
          {Object.entries(FACILITY_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </label>
      <button className={`${btnSecondary} w-full`} onClick={onEdit}><Pencil size={14} /> Edit facility</button>
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Nearby (within 300 m)</h4>
        <NearbyList state={nearby} onPick={onFocusFacility} empty="No other facilities within 300 m." />
      </div>
    </Shell>
  )
}

function IncidentDetails({ item, onClose, onEdit, onChanged, onFocusFacility }) {
  const toast = useToast()
  const isMedical = item.category === 'medical_emergency'
  const nearby = useAsync(
    () => incidentsApi.nearby(item.id, { radius: 1500, category: isMedical ? 'medical_post' : undefined }),
    [item.id],
  )

  async function setStatus(status) {
    try {
      await incidentsApi.update(item.id, { status })
      toast.success(`Marked ${INCIDENT_STATUSES[status].label.toLowerCase()}`)
      onChanged()
    } catch (err) { toast.error(errorMessage(err)) }
  }

  return (
    <Shell title={item.title} subtitle={INCIDENT_CATEGORIES[item.category]} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        <Badge tone={SEVERITIES[item.severity]?.tone}>{SEVERITIES[item.severity]?.label} severity</Badge>
        <Badge tone={INCIDENT_STATUSES[item.status]?.tone}>{INCIDENT_STATUSES[item.status]?.label}</Badge>
        {item.is_simulated && <SimulatedBadge />}
      </div>
      <div className="divide-y divide-slate-100">
        <Row label="Reported">{formatDateTime(item.reported_at)}</Row>
        <Row label="Coordinates">{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Row>
      </div>
      {item.description && <p className="text-sm text-slate-600">{item.description}</p>}
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</h4>
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(INCIDENT_STATUSES).map(([k, v]) => (
            <button
              key={k}
              disabled={item.status === k}
              onClick={() => setStatus(k)}
              className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                item.status === k ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <button className={`${btnSecondary} w-full`} onClick={onEdit}><Pencil size={14} /> Edit incident</button>
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {isMedical ? 'Nearest medical posts' : 'Nearest facilities'} (within 1.5 km)
        </h4>
        <NearbyList state={nearby} onPick={onFocusFacility} empty="No facilities found within 1.5 km." />
      </div>
    </Shell>
  )
}

function RouteDetails({ item, onClose, onFocusFacility }) {
  const type = ROUTE_TYPES[item.route_type]
  const nearby = useAsync(() => routesApi.nearFacilities(item.id, { radius: 150 }), [item.id])
  const start = item.coordinates[0]
  const end = item.coordinates[item.coordinates.length - 1]
  return (
    <Shell title={item.name} subtitle={type?.label} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        <Badge tone="blue">{type?.label}</Badge>
        {item.is_simulated && <SimulatedBadge />}
      </div>
      <div className="divide-y divide-slate-100">
        <Row label="Length">{item.length_m != null ? formatDistance(item.length_m) : '–'}</Row>
        <Row label="Start"><MapPin size={12} className="mr-1 inline text-emerald-600" />{start[0].toFixed(5)}, {start[1].toFixed(5)}</Row>
        <Row label="End"><MapPin size={12} className="mr-1 inline text-red-600" />{end[0].toFixed(5)}, {end[1].toFixed(5)}</Row>
      </div>
      <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
        This is a mapped path (a LineString), not a turn-by-turn navigation engine.
      </p>
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Facilities within 150 m of this route</h4>
        <NearbyList state={nearby} onPick={onFocusFacility} empty="No facilities within 150 m of this route." />
      </div>
    </Shell>
  )
}

export default function DetailsPanel({ kind, ...props }) {
  if (kind === 'facility') return <FacilityDetails {...props} />
  if (kind === 'incident') return <IncidentDetails {...props} />
  return <RouteDetails {...props} />
}