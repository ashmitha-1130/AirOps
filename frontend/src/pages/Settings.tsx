import { PageHeader, Card, Badge } from '../components/UI'
import { Shield, Cpu, Database, Globe } from 'lucide-react'

export default function Settings() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Application configuration, system information, and scope notice" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={16} className="text-teal-600" />
            <h2 className="text-sm font-semibold text-slate-700">Application Info</h2>
          </div>
          <dl className="space-y-3">
            {[
              ['Project', 'AirOps — Resource Planning & Optimisation'],
              ['Problem ID', <Badge label="SIH 2026 · #26250" color="blue" />],
              ['Organisation', 'Ministry of Defence (MoD)'],
              ['Department', 'Defence Services Staff College'],
              ['Theme', 'Transportation & Logistics'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex gap-3">
                <dt className="text-xs font-semibold text-slate-500 w-32 shrink-0 pt-0.5">{k}</dt>
                <dd className="text-sm text-slate-800">{v as any}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-700">Technology Stack</h2>
          </div>
          <dl className="space-y-3">
            {[
              ['Backend', 'FastAPI + SQLAlchemy + SQLite'],
              ['Scheduler', 'Google OR-Tools CP-SAT'],
              ['Frontend', 'React 19 + Vite + TypeScript'],
              ['Styling', 'Tailwind CSS v4'],
              ['Charts', 'Recharts'],
              ['Timezone', 'Indian Standard Time (UTC+5:30)'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex gap-3">
                <dt className="text-xs font-semibold text-slate-500 w-32 shrink-0 pt-0.5">{k}</dt>
                <dd className="text-sm text-slate-800">{v as any}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-purple-600" />
            <h2 className="text-sm font-semibold text-slate-700">Data & Scope</h2>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p>This application uses <strong>synthetic and fictional demonstration data only</strong>.</p>
            <p>It does not connect to any military systems or external operational infrastructure.</p>
            <p>Scheduling is restricted to generic non-combat logistics, training, maintenance, and administrative activities.</p>
            <p>All schedule decisions require <strong>human review and approval</strong> before taking effect.</p>
          </div>
        </Card>

        <Card className="p-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">Safety Notice</h2>
          </div>
          <div className="space-y-2 text-sm text-amber-800">
            <p>The approval mechanism is a <strong>prototype demonstration</strong>.</p>
            <p>Production deployments require proper authentication, authorisation, role-based access control, and security audits.</p>
            <p>No real operational data is stored or processed by this system.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
