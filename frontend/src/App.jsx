import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import MapExplorer from './pages/MapExplorer.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import Facilities from './pages/Facilities.jsx'
import Incidents from './pages/Incidents.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/map" element={<MapExplorer />} />
        <Route path="/facilities" element={<Facilities />} />
        <Route path="/routes" element={<ComingSoon title="Routes" note="Routes are already drawn on the map. The management page comes later." />} />
        <Route path="/crowd" element={<ComingSoon title="Crowd Monitoring" note="YOLO person detection arrives in Phase 6." />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/surveys" element={<ComingSoon title="Field Surveys" note="Coming in a later phase." />} />
        <Route path="/import" element={<ComingSoon title="GIS Data Import" note="Coming in a later phase." />} />
        <Route path="/drone" element={<ComingSoon title="Drone Imagery" note="Coming in a later phase." />} />
        <Route path="/cameras" element={<ComingSoon title="Camera Management" note="Coming in a later phase." />} />
        <Route path="/settings" element={<ComingSoon title="Settings" note="Crowd thresholds and preferences, later." />} />
        <Route path="*" element={<ComingSoon title="Page not found" note="That URL does not exist." />} />
      </Route>
    </Routes>
  )
}