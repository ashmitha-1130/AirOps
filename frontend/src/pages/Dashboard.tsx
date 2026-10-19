import { useEffect, useState } from 'react'
import api from '../services/api'
import { StatCard, Card, Spinner, Badge, Alert, Btn, ProgressBar } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format } from 'date-fns'
import { Server, Users, ClipboardList, AlertTriangle, RefreshCw, Zap } from 'lucide-react'

const COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981']

function statusColor(s: string) {
  if (s === 'APPROVED') return 'green'
  if (s === 'REJECTED') return 'red'
  if (s === 'PENDING_REVIEW') return 'yellow'
  return 'gray'
}

const EVENT_COLORS: Record<string, string> = {
  SCHEDULE_APPROVED: 'green', SCHEDULE_REJECTED: 'red', SCHEDULE_GENERATED: 'blue',
  RESOURCE_CREATED: 'teal', STAFF_CREATED: 'purple', TASK_CREATED: 'blue',
  CSV_IMPORT: 'orange', SEED_DATA_LOADED: 'teal',
  SCENARIO_RESOURCE_UNAVAILABLE: 'yellow', SCENARIO_STAFF_UNAVAILABLE: 'yellow',
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const load = () => {
    setLoading(true)
    api.get('/dashboard')
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => { setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const loadDemo = async () => {
    setLoadingDemo(true)
    setAlert(null)
    try {
      const r = await api.post('/demo/load')
      const c = r.data.loaded
      setAlert({ type: 'success', msg: `Demo data loaded — ${c.resources} resources, ${c.staff} staff, ${c.tasks} tasks, ${c.constraints} constraints.` })
      load()
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Failed to load demo data.' })
    }
    setLoadingDemo(false)
  }

  if (loading) return <div className="p-8"><Spinner /></div>

  const schedPct = data?.tasks?.total > 0 ? Math.round((data.tasks.scheduled / data.tasks.total) * 100) : 0
  const staffPct = data?.staff?.total > 0 ? Math.round((data.staff.available / data.staff.total) * 100) : 0
  const resPct   = data?.resources?.total > 0 ? Math.round((data.resources.available / data.resources.total) * 100) : 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Overview</h1>
          <p className="text-sm text-slate-500 mt-1">AirOps Resource Planning & Optimisation — SIH 2026</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm" onClick={load}><RefreshCw size={13} />Refresh</Btn>
          <Btn size="sm" onClick={loadDemo} disabled={loadingDemo}>
            <Zap size={13} />{loadingDemo ? 'Loading...' : 'Load Demo Data'}
          </Btn>
        </div>
      </div>

      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Resources" value={data?.resources?.total ?? 0}
          sub={`${data?.resources?.available ?? 0} available · ${data?.resources?.under_maintenance ?? 0} in maintenance`}
          color="blue" icon={<Server size={18} />} />
        <StatCard label="Total Staff" value={data?.staff?.total ?? 0}
          sub={`${data?.staff?.available ?? 0} available`}
          color="purple" icon={<Users size={18} />} />
        <StatCard label="Total Tasks" value={data?.tasks?.total ?? 0}
          sub={`${data?.tasks?.scheduled ?? 0} scheduled · ${data?.tasks?.unscheduled ?? 0} pending`}
          color="teal" icon={<ClipboardList size={18} />} />
        <StatCard label="Unresolved Conflicts" value={data?.conflicts ?? 0}
          sub="Unscheduled tasks in latest run"
          color={data?.conflicts > 0 ? 'red' : 'green'} icon={<AlertTriangle size={18} />} />
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Task Scheduling Rate', value: data?.tasks?.scheduled ?? 0, max: data?.tasks?.total ?? 0, pct: schedPct, color: 'teal' as const },
          { label: 'Staff Availability', value: data?.staff?.available ?? 0, max: data?.staff?.total ?? 0, pct: staffPct, color: 'blue' as const },
          { label: 'Resource Availability', value: data?.resources?.available ?? 0, max: data?.resources?.total ?? 0, pct: resPct, color: 'green' as const },
        ].map(({ label, value, max, pct, color }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">{label}</span>
              <span className="text-sm font-bold text-slate-800">{pct}%</span>
            </div>
            <ProgressBar value={value} max={max} color={color} />
            <p className="text-xs text-slate-400 mt-1.5">{value} / {max}</p>
          </Card>
        ))}
      </div>

      {/* Latest Schedule */}
      {data?.latest_schedule?.schedule_id && (
        <Card className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Schedule</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-semibold text-slate-800">{data.latest_schedule.schedule_id}</span>
            <Badge label={data.latest_schedule.status} color={statusColor(data.latest_schedule.status)} dot />
            <Badge label={data.latest_schedule.solver_status} color="blue" />
            <span className="text-sm text-slate-500">{data.latest_schedule.scheduled_tasks}/{data.latest_schedule.total_tasks} tasks scheduled</span>
            {data.latest_schedule.created_at && (
              <span className="text-xs text-slate-400 ml-auto">{format(new Date(data.latest_schedule.created_at), 'dd MMM yyyy, HH:mm')}</span>
            )}
          </div>
          {data.latest_schedule.total_tasks > 0 && (
            <div className="mt-3">
              <ProgressBar value={data.latest_schedule.scheduled_tasks} max={data.latest_schedule.total_tasks} color="teal" />
            </div>
          )}
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Resource Utilisation by Type</h3>
          {(data?.resource_utilisation ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data — load demo data to populate</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.resource_utilisation} margin={{ top: 0, right: 8, left: -20, bottom: 0 }} barGap={2}>
                <XAxis dataKey="type" tick={{ fontSize: 10 }} tickFormatter={v => v.replace(/_/g, ' ').slice(0, 10)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any, n: any) => [v, n === 'available' ? 'Available' : 'Unavailable']} />
                <Bar dataKey="available" fill="#0d9488" name="Available" radius={[3, 3, 0, 0]} />
                <Bar dataKey="utilised" fill="#f59e0b" name="Unavailable" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Distribution by Category</h3>
          {(data?.task_distribution ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data — load demo data to populate</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.task_distribution} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                  {data.task_distribution.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v, n.replace(/_/g, ' ')]} />
                <Legend formatter={(v: string) => v.replace(/_/g, ' ')} iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Recent System Events</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {(data?.recent_events ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No events yet. Load demo data to get started.</div>
          ) : (
            (data.recent_events ?? []).map((e: any) => (
              <div key={e.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <Badge label={e.event_type.replace(/_/g, ' ')} color={EVENT_COLORS[e.event_type] ?? 'gray'} />
                <span className="text-sm text-slate-600 flex-1 min-w-0 truncate">{e.description}</span>
                <span className="text-xs text-slate-400 shrink-0 tabular-nums">{format(new Date(e.created_at), 'HH:mm:ss')}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
