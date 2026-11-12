import { useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, Eye, Pencil, Plus, Siren } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { errorMessage, incidentsApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import IncidentForm from '../components/IncidentForm'
import {
  Badge, Card, EmptyState, ErrorState, LoadingState, SimulatedBadge, StatCard, btnPrimary, btnSecondary, inputCls,
} from '../components/ui'
import { FACILITY_CATEGORIES, INCIDENT_CATEGORIES, INCIDENT_STATUSES, SEVERITIES } from '../utils/constants'
import { formatDateTime, formatDistance, timeAgo } from '../utils/format'

export default function Incidents() {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => incidentsApi.list({ limit: 1000 }), [], { interval: 10000 })
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | incident
  const [responders, setResponders] = useState(null) // { incident, facilities }

  const stats = useMemo(() => {
    const list = data ?? []
    return {
      total: list.length,
      open: list.filter((i) => i.status === 'open').length,
      ack: list.filter((i) => i.status === 'acknowledged').length,
      resolved: list.filter((i) => i.status === 'resolved').length,
    }
  }, [data])

  const rows = useMemo(
    () => (data ?? []).filter(
      (i) => (!category || i.category === category) && (!severity || i.severity === severity) && (!status || i.status === status),
    ),
    [data, category, severity, status],
  )

  async function changeStatus(incident, next) {
    try {
      await incidentsApi.update(incident.id, { status: next })
      toast.success(`"${incident.title}" marked ${INCIDENT_STATUSES[next].label.toLowerCase()}`)
      reload()
    } catch (err) { toast.error(errorMessage(err)) }
  }

  if (loading && !data) return <LoadingState label="Loading incidents…" />
  if (error && !data) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Siren} label="Total incidents" value={stats.total} color="#0f766e" />
        <StatCard icon={CircleAlert} label="Open" value={stats.open} color="#dc2626" />
        <StatCard icon={Eye} label="Acknowledged" value={stats.ack} color="#f59e0b" />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} color="#16a34a" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select className={`${inputCls} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {Object.entries(INCIDENT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          {Object.entries(SEVERITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(INCIDENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className={`${btnPrimary} ml-auto`} onClick={() => setEditing('new')}>
          <Plus size={16} /> Report incident
        </button>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No incidents match" hint="Change the filters or report a new incident." />
        ) : (
          <div className="-m-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Incident</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Reported</th>
                  <th className="px-4 py-2.5 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{i.title} {i.is_simulated && <SimulatedBadge />}</p>
                      <p className="text-xs text-slate-500">{i.latitude.toFixed(5)}, {i.longitude.toFixed(5)}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{INCIDENT_CATEGORIES[i.category]}</td>
                    <td className="px-4 py-2.5"><Badge tone={SEVERITIES[i.severity]?.tone}>{SEVERITIES[i.severity]?.label}</Badge></td>
                    <td className="px-4 py-2.5">
                      <select
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                        value={i.status}
                        onChange={(e) => changeStatus(i, e.target.value)}
                      >
                        {Object.entries(INCIDENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500" title={formatDateTime(i.reported_at)}>{timeAgo(i.reported_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button title="Edit" onClick={() => setEditing(i)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700"><Pencil size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <Modal wide title={editing === 'new' ? 'Report incident' : 'Edit incident'} onClose={() => setEditing(null)}>
          <IncidentForm
            incident={editing === 'new' ? undefined : editing}
            onSaved={(incident, facilities) => {
              setEditing(null)
              reload()
              if (facilities?.length) setResponders({ incident, facilities })
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {responders && (
        <Modal title="Nearest responders (PostGIS)" onClose={() => setResponders(null)}>
          <p className="mb-3 text-sm text-slate-600">
            For <b>{responders.incident.title}</b>, the database found these open facilities, nearest first:
          </p>
          <ul className="divide-y divide-slate-100">
            {responders.facilities.map((f) => {
              const cat = FACILITY_CATEGORIES[f.category] ?? FACILITY_CATEGORIES.other
              return (
                <li key={f.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ background: cat.color }}>
                    <cat.icon size={15} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{f.name}</p>
                    <p className="text-xs text-slate-500">{cat.label} · {f.area ?? '–'}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{formatDistance(f.distance_m)}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex justify-end">
            <button className={btnSecondary} onClick={() => setResponders(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}