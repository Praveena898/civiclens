import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { errorMessage, facilitiesApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal, { ConfirmDialog } from '../components/Modal'
import FacilityForm from '../components/FacilityForm'
import {
  Badge, Card, EmptyState, ErrorState, LoadingState, SimulatedBadge, btnPrimary, inputCls,
} from '../components/ui'
import { FACILITY_CATEGORIES, FACILITY_STATUSES } from '../utils/constants'
import { formatDateTime } from '../utils/format'

export default function Facilities() {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => facilitiesApi.list({ limit: 1000 }), [])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | facility object
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data ?? []).filter(
      (f) =>
        (!category || f.category === category) &&
        (!status || f.status === status) &&
        (!q || `${f.name} ${f.area ?? ''}`.toLowerCase().includes(q)),
    )
  }, [data, search, category, status])

  async function confirmDelete() {
    setBusy(true)
    try {
      await facilitiesApi.remove(deleting.id)
      toast.success(`Deleted "${deleting.name}"`)
      setDeleting(null)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading && !data) return <LoadingState label="Loading facilities…" />
  if (error && !data) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
          <input className={`${inputCls} pl-8`} placeholder="Search name or zone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={`${inputCls} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {Object.entries(FACILITY_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(FACILITY_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className={`${btnPrimary} ml-auto`} onClick={() => setEditing('new')}>
          <Plus size={16} /> Add facility
        </button>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No facilities match" hint="Try clearing the filters, or add a new facility." />
        ) : (
          <div className="-m-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Area</th>
                  <th className="px-4 py-2.5">Capacity</th>
                  <th className="px-4 py-2.5">Added</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((f) => {
                  const cat = FACILITY_CATEGORIES[f.category] ?? FACILITY_CATEGORIES.other
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {f.name} {f.is_simulated && <SimulatedBadge />}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: cat.color }}>
                            <cat.icon size={13} />
                          </span>
                          {cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5"><Badge tone={FACILITY_STATUSES[f.status]?.tone}>{FACILITY_STATUSES[f.status]?.label}</Badge></td>
                      <td className="px-4 py-2.5 text-slate-600">{f.area ?? '–'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{f.capacity ?? '–'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{formatDateTime(f.created_at)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button title="Edit" onClick={() => setEditing(f)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700"><Pencil size={15} /></button>
                        <button title="Delete" onClick={() => setDeleting(f)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-slate-500">Showing {rows.length} of {data?.length ?? 0} facilities.</p>

      {editing && (
        <Modal wide title={editing === 'new' ? 'Add facility' : 'Edit facility'} onClose={() => setEditing(null)}>
          <FacilityForm
            facility={editing === 'new' ? undefined : editing}
            onSaved={() => { setEditing(null); reload() }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete facility?"
          message={`"${deleting.name}" will be permanently removed from the map and database.`}
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}