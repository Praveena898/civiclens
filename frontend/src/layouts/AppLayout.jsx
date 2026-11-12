import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Building2, Camera, ClipboardList, FileUp, LayoutDashboard, Map as MapIcon, PanelLeftClose,
  PanelLeftOpen, Radar, Route as RouteIcon, Satellite, Settings, Siren, Users,
} from 'lucide-react'
import { Badge } from '../components/ui'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/map', label: 'Map Explorer', icon: MapIcon },
  { to: '/facilities', label: 'Facilities', icon: Building2 },
  { to: '/routes', label: 'Routes', icon: RouteIcon },
  { to: '/crowd', label: 'Crowd Monitoring', icon: Users },
  { to: '/incidents', label: 'Incidents', icon: Siren },
  { to: '/surveys', label: 'Field Surveys', icon: ClipboardList },
  { to: '/import', label: 'GIS Data Import', icon: FileUp },
  { to: '/drone', label: 'Drone Imagery', icon: Satellite },
  { to: '/cameras', label: 'Cameras', icon: Camera },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024)
  const { pathname } = useLocation()
  const current = NAV.find((n) => pathname.startsWith(n.to))

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`flex shrink-0 flex-col bg-navy-900 text-slate-300 transition-[width] duration-200 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
        <div className="flex h-14 items-center gap-3 border-b border-white/10 px-4">
          <span className="rounded-lg bg-teal-500 p-1.5 text-white"><Radar size={20} /></span>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-base font-semibold text-white">CivicLens</p>
              <p className="text-[10px] text-slate-400">Geospatial Intelligence</p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-teal-500/15 text-teal-300' : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-3 border-t border-white/10 px-6 py-3 text-sm text-slate-400 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /> Collapse</>}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <h1 className="text-base font-semibold text-slate-900">{current?.label ?? 'CivicLens'}</h1>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline"><Badge tone="amber">Includes simulated demo data</Badge></span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">AD</span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}