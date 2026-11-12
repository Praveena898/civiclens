import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, Building2, Headset, HeartPulse, Map as MapIcon, Siren, SquareParking, Users,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useAsync } from '../hooks/useAsync'
import { dashboardApi } from '../services/api'
import { Card, EmptyState, ErrorState, LoadingState, StatCard } from '../components/ui'
import { CROWD_LEVELS, FACILITY_CATEGORIES, SEVERITIES } from '../utils/constants'
import { timeAgo } from '../utils/format'

const QUICK_LINKS = [
  { to: '/map', label: 'Open Map Explorer', icon: MapIcon },
  { to: '/incidents', label: 'Manage incidents', icon: Siren },
  { to: '/facilities', label: 'Manage facilities', icon: Building2 },
  { to: '/crowd', label: 'Crowd monitoring', icon: Users },
]

export default function Dashboard() {
  const summary = useAsync(dashboardApi.summary, [], { interval: 15000 })
  const charts = useAsync(dashboardApi.charts, [], { interval: 15000 })

  if (summary.loading && !summary.data) return <LoadingState label="Loading dashboard…" />
  if (summary.error && !summary.data) return <ErrorState message={summary.error} onRetry={summary.reload} />

  const { totals, crowd, recent_activity: recent } = summary.data
  const c = charts.data
  const facilityData = (c?.facilities_by_category ?? []).map((d) => ({
    name: FACILITY_CATEGORIES[d.name]?.label ?? d.name, value: d.value, color: FACILITY_CATEGORIES[d.name]?.color ?? '#64748b',
  }))
  const severityData = (c?.incidents_by_severity ?? []).map((d) => ({
    name: SEVERITIES[d.name]?.label ?? d.name, value: d.value, color: SEVERITIES[d.name]?.color ?? '#64748b',
  }))

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Building2} label="Mapped facilities" value={totals.facilities} hint={`${totals.routes} routes mapped`} color="#0f766e" />
        <StatCard icon={SquareParking} label="Parking areas" value={totals.parking} color="#2563eb" />
        <StatCard icon={HeartPulse} label="Medical posts" value={totals.medical_posts} color="#dc2626" />
        <StatCard icon={Headset} label="Help desks" value={totals.help_desks} color="#0891b2" />
        <StatCard icon={Siren} label="Reported incidents" value={totals.incidents} hint={`${totals.open_incidents} currently open`} color="#ea580c" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Current crowd conditions" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(CROWD_LEVELS).map(([key, lvl]) => (
              <div key={key} className="rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-2xl font-semibold" style={{ color: lvl.color }}>{crowd[key]}</p>
                <p className="text-xs text-slate-500">{lvl.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Latest reading from each of {crowd.cameras_reporting} monitoring points. Levels come from a configurable
            demo threshold on the people-in-frame count, not a measured physical density.
          </p>
        </Card>

        <Card title="Quick navigation">
          <div className="space-y-1">
            {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <span className="flex items-center gap-2"><Icon size={16} className="text-teal-600" /> {label}</span>
                <ArrowRight size={14} className="text-slate-400" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Facilities by category" className="lg:col-span-1">
          {facilityData.length === 0 ? <EmptyState title="No facilities yet" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityData} layout="vertical" margin={{ left: 4, right: 16 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {facilityData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Incidents by severity">
          {severityData.length === 0 ? <EmptyState title="No incidents reported" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {severityData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="-mt-2 flex flex-wrap justify-center gap-x-3 text-xs text-slate-600">
                {severityData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Recent activity">
          {recent.length === 0 ? <EmptyState title="No activity yet" /> : (
            <ul className="space-y-3">
              {recent.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-0.5 rounded-lg p-1.5 ${a.type === 'incident' ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-600'}`}>
                    {a.type === 'incident' ? <Siren size={14} /> : <Activity size={14} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.detail} · {timeAgo(a.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}