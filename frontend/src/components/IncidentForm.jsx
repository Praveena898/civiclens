import { useState } from 'react'
import { Spinner, Field, inputCls, btnPrimary, btnSecondary } from './ui'
import LocationPicker from './LocationPicker'
import { useToast } from '../context/ToastContext'
import { errorMessage, incidentsApi } from '../services/api'
import { INCIDENT_CATEGORIES, INCIDENT_STATUSES, SEVERITIES } from '../utils/constants'
import { formatDistance } from '../utils/format'

export default function IncidentForm({ incident, initialLocation, onSaved, onCancel }) {
  const toast = useToast()
  const [f, setF] = useState({
    title: incident?.title ?? '',
    category: incident?.category ?? 'medical_emergency',
    severity: incident?.severity ?? 'medium',
    status: incident?.status ?? 'open',
    description: incident?.description ?? '',
    latitude: incident?.latitude ?? initialLocation?.lat ?? null,
    longitude: incident?.longitude ?? initialLocation?.lon ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (f.latitude == null) return setError('Click the map to mark where the incident happened.')
    const body = {
      title: f.title.trim(),
      category: f.category,
      severity: f.severity,
      description: f.description.trim() || null,
      latitude: f.latitude,
      longitude: f.longitude,
    }
    setSaving(true)
    try {
      if (incident) {
        const saved = await incidentsApi.update(incident.id, { ...body, status: f.status })
        toast.success('Incident updated')
        onSaved(saved, [])
      } else {
        const res = await incidentsApi.create(body)
        const first = res.nearby_facilities[0]
        toast.success(
          first
            ? `Incident reported. Nearest responder: ${first.name} (${formatDistance(first.distance_m)})`
            : `Incident reported. No responders found within ${res.search_radius_m} m.`,
        )
        onSaved(res.incident, res.nearby_facilities)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Incident title" required>
        <input className={inputCls} value={f.title} onChange={set('title')} required minLength={3} maxLength={160} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Category" required>
          <select className={inputCls} value={f.category} onChange={set('category')}>
            {Object.entries(INCIDENT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Severity" required>
          <select className={inputCls} value={f.severity} onChange={set('severity')}>
            {Object.entries(SEVERITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        {incident && (
          <Field label="Status">
            <select className={inputCls} value={f.status} onChange={set('status')}>
              {Object.entries(INCIDENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        )}
      </div>
      <Field label="Description">
        <textarea className={inputCls} rows={2} value={f.description} onChange={set('description')} maxLength={2000} />
      </Field>
      <Field label="Location (click the map)" required>
        <LocationPicker
          lat={f.latitude}
          lon={f.longitude}
          onChange={(latitude, longitude) => setF((p) => ({ ...p, latitude, longitude }))}
        />
      </Field>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onCancel}>Cancel</button>
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving && <Spinner className="h-4 w-4" />} {incident ? 'Save changes' : 'Report incident'}
        </button>
      </div>
    </form>
  )
}