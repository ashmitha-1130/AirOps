import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Resources from './pages/Resources'
import StaffPage from './pages/StaffPage'
import Tasks from './pages/Tasks'
import DataImport from './pages/DataImport'
import SchedulePlanner from './pages/SchedulePlanner'
import ScenarioSimulator from './pages/ScenarioSimulator'
import ScheduleCompare from './pages/ScheduleCompare'
import ScheduleReview from './pages/ScheduleReview'
import AuditHistory from './pages/AuditHistory'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/schedule" element={<SchedulePlanner />} />
          <Route path="/scenario" element={<ScenarioSimulator />} />
          <Route path="/compare" element={<ScheduleCompare />} />
          <Route path="/review" element={<ScheduleReview />} />
          <Route path="/audit" element={<AuditHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
