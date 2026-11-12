import { CircleAlert, Inbox, LoaderCircle } from 'lucide-react'

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
}

export function Badge({ tone = 'slate', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone] ?? TONES.slate}`}>
      {children}
    </span>
  )
}

export const SimulatedBadge = () => <Badge tone="amber">Simulated</Badge>

export function Spinner({ className = 'h-5 w-5' }) {
  return <LoaderCircle className={`animate-spin ${className}`} />
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner /> {label}
    </div>
  )
}

export function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Inbox className="mb-2 text-slate-300" size={36} />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="mx-auto my-8 max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-center">
      <CircleAlert className="mx-auto mb-2 text-red-500" size={28} />
      <p className="text-sm font-medium text-red-800">Could not load data</p>
      <p className="mt-1 text-xs text-red-700">{message}</p>
      {onRetry && <button onClick={onRetry} className={`${btnSecondary} mt-3`}>Try again</button>}
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, hint, color = '#0f766e' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className="rounded-lg p-2" style={{ background: `${color}1A`, color }}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value ?? '–'}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Field({ label, children, required }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'
export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60'
export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60'
export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60'