import { useState } from 'react'
import { Spinner, Field, inputCls, btnPrimary, btnSecondary } from './ui'
import LocationPicker from './LocationPicker'
import { useToast } from '../context/ToastContext'
import { errorMessage, facilitiesApi } from '../services/api'
import { FACILITY_CATEGORIES, FACILITY_STATUSES } from '../utils/constants'

export default function FacilityForm({ facility, initialLocation, onSaved, onCancel }) {
  const toast = useToast()
  const [f, setF] = useState({
    name: facility?.name ?? '',
    category: facility?.category ?? 'parking',
    description: facility?.description ?? '',
    status: facility?.status ?? 'operational',
    capacity: facility?.capacity ?? '',
    contact: facility?.contact ?? '',
    area: facility?.area ?? '',
    latitude: facility?.latitude ?? initialLocation?.lat ?? null,
    longitude: facility?.longitude ?? initialLocation?.lon ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (f.latitude == null) return setError('Click the map to choose the facility location.')
    const body = {
      name: f.name.trim(),
      category: f.category,
      description: f.description.trim() || null,
      status: f.status,
      capacity: f.capacity === '' ? null : Number(f.capacity),
      contact: f.contact.trim() || null,
      area: f.area.trim() || null,
      latitude: f.latitude,
      longitude: f.longitude,
    }
    setSaving(true)
    try {
      const saved = facility ? await facilitiesApi.update(facility.id, body) : await facilitiesApi.create(body)
      toast.success(facility ? 'Facility updated' : 'Facility created')
      onSaved(saved)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Facility name" required>
          <input className={inputCls} value={f.name} onChange={set('name')} required minLength={2} maxLength={120} />
        </Field>
        <Field label="Category" required>
          <select className={inputCls} value={f.category} onChange={set('category')}>
            {Object.entries(FACILITY_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Operational status">
          <select className={inputCls} value={f.status} onChange={set('status')}>
            {Object.entries(FACILITY_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Capacity (optional)">
          <input className={inputCls} type="number" min="0" value={f.capacity} onChange={set('capacity')} />
        </Field>
        <Field label="Area / zone">
          <input className={inputCls} value={f.area} onChange={set('area')} maxLength={120} />
        </Field>
        <Field label="Contact (optional)">
          <input className={inputCls} value={f.contact} onChange={set('contact')} maxLength={120} />
        </Field>
      </div>
      <Field label="Description">
        <textarea className={inputCls} rows={2} value={f.description} onChange={set('description')} maxLength={1000} />
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
          {saving && <Spinner className="h-4 w-4" />} {facility ? 'Save changes' : 'Create facility'}
        </button>
      </div>
    </form>
  )
}