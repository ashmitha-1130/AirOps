import { useEffect, useState } from 'react'
import api, { type ScheduleRun } from '../services/api'
import { PageHeader, Card, Badge, Spinner, Btn, ProgressBar } from '../components/UI'
import { format } from 'date-fns'
import { GitCompare } from 'lucide-react'

function statusColor(s: string) {
  if (s === 'APPROVED') return 'green'
  if (s === 'REJECTED') return 'red'
  if (s === 'PENDING_REVIEW') return 'yellow'
  return 'gray'
}

function ComparePanel({ s, label }: { s: ScheduleRun; label: string }) {
  const pct = s.total_tasks > 0 ? Math.round((s.scheduled_tasks / s.total_tasks) * 100) : 0
  return (
    <Card className="p-5 flex-1">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded">{label}</span>
        <span className="font-mono text-sm font-semibold text-slate-800">{s.schedule_id}</span>
        <Badge label={`v${s.version}`} color="blue" />
        <Badge label={s.status} color={statusColor(s.status)} dot />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Scheduled', value: s.scheduled_tasks, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Unscheduled', value: s.unscheduled_tasks, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Coverage', value: `${pct}%`, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Runtime', value: `${s.runtime_seconds?.toFixed(2) ?? '—'}s`, color: 'text-slate-700', bg: 'bg-slate-50' },
        ].map(({ label: l, value, color, bg }) => (
          <div key={l} className={`p-3 rounded-xl ${bg} text-center`}>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Scheduling Rate</span><span>{pct}%</span>
        </div>
        <ProgressBar value={s.scheduled_tasks} max={s.total_tasks} color="teal" />
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">Solver Status</span>
          <Badge label={s.solver_status} color={s.solver_status === 'OPTIMAL' ? 'teal' : s.solver_status === 'FEASIBLE' ? 'blue' : 'red'} />
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">Objective Score</span>
          <span className="font-semibold text-slate-700">{s.objective_score?.toFixed(1) ?? '—'}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">Total Tasks</span>
          <span className="font-semibold text-slate-700">{s.total_tasks}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">Created</span>
          <span className="font-semibold text-slate-700">{format(new Date(s.created_at), 'dd MMM HH:mm')}</span>
        </div>
        {s.scenario_description && (
          <div className="py-1.5">
            <span className="text-slate-500 block mb-1">Scenario</span>
            <span className="text-slate-700 leading-relaxed">{s.scenario_description}</span>
          </div>
        )}
      </div>

      {/* Unscheduled tasks */}
      {s.assignments.filter(a => !a.is_scheduled).length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">Unscheduled Tasks</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {s.assignments.filter(a => !a.is_scheduled).map(a => (
              <div key={a.id} className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-lg">
                <span className="font-mono text-xs text-red-700 shrink-0">{a.task_id}</span>
                <span className="text-xs text-red-600">{a.unscheduled_reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function ScheduleCompare() {
  const [schedules, setSchedules] = useState<ScheduleRun[]>([])
  const [loading, setLoading] = useState(true)
  const [leftId, setLeftId] = useState<string | null>(null)
  const [rightId, setRightId] = useState<string | null>(null)
  const [leftDetail, setLeftDetail] = useState<ScheduleRun | null>(null)
  const [rightDetail, setRightDetail] = useState<ScheduleRun | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    api.get('/schedules').then(r => { setSchedules(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const selectLeft = async (s: ScheduleRun) => {
    setLeftId(s.schedule_id)
    setLoadingDetail(true)
    const r = await api.get(`/schedules/${s.schedule_id}`)
    setLeftDetail(r.data)
    setLoadingDetail(false)
  }

  const selectRight = async (s: ScheduleRun) => {
    setRightId(s.schedule_id)
    setLoadingDetail(true)
    const r = await api.get(`/schedules/${s.schedule_id}`)
    setRightDetail(r.data)
    setLoadingDetail(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Schedule Comparison" subtitle="Compare two schedule runs side by side to evaluate solver performance and coverage" />

      {loading ? <Spinner /> : schedules.length < 2 ? (
        <Card className="p-12 text-center">
          <GitCompare size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Generate at least two schedules to compare them.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selector */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Select Schedules</h3>
            <p className="text-xs text-slate-500 mb-3">Click a schedule to assign it to Slot A or Slot B.</p>
            <div className="flex gap-2 mb-3">
              <Btn size="sm" variant={leftId ? 'primary' : 'outline'} disabled>Slot A: {leftId ?? 'None'}</Btn>
              <Btn size="sm" variant={rightId ? 'primary' : 'outline'} disabled>Slot B: {rightId ?? 'None'}</Btn>
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {schedules.map(s => (
                <div key={s.id} className="flex gap-1">
                  <button onClick={() => selectLeft(s)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg border text-xs transition-all ${leftId === s.schedule_id ? 'border-teal-400 bg-teal-50 font-semibold' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="font-mono">{s.schedule_id}</span>
                    <span className="ml-1 text-slate-400">v{s.version}</span>
                  </button>
                  <button onClick={() => selectRight(s)}
                    className={`px-2 py-2 rounded-lg border text-xs transition-all ${rightId === s.schedule_id ? 'border-blue-400 bg-blue-50 text-blue-700 font-semibold' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}>
                    B
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Comparison panels */}
          <div className="lg:col-span-2">
            {loadingDetail ? <Spinner /> : (
              !leftDetail && !rightDetail ? (
                <Card className="p-12 text-center">
                  <p className="text-slate-400 text-sm">Select schedules from the list to compare.</p>
                </Card>
              ) : (
                <div className="flex gap-4">
                  {leftDetail ? <ComparePanel s={leftDetail} label="A" /> : (
                    <Card className="p-8 flex-1 text-center text-slate-400 text-sm">Select Slot A</Card>
                  )}
                  {rightDetail ? <ComparePanel s={rightDetail} label="B" /> : (
                    <Card className="p-8 flex-1 text-center text-slate-400 text-sm">Select Slot B</Card>
                  )}
                </div>
              )
            )}

            {/* Delta summary */}
            {leftDetail && rightDetail && (
              <Card className="p-5 mt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Δ Comparison Summary (A → B)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Scheduled Tasks', a: leftDetail.scheduled_tasks, b: rightDetail.scheduled_tasks },
                    { label: 'Unscheduled Tasks', a: leftDetail.unscheduled_tasks, b: rightDetail.unscheduled_tasks, invert: true },
                    { label: 'Objective Score', a: leftDetail.objective_score ?? 0, b: rightDetail.objective_score ?? 0 },
                  ].map(({ label, a, b, invert }) => {
                    const delta = b - a
                    const better = invert ? delta < 0 : delta > 0
                    const worse = invert ? delta > 0 : delta < 0
                    return (
                      <div key={label} className="p-3 bg-slate-50 rounded-xl text-center">
                        <p className="text-xs text-slate-500 mb-1">{label}</p>
                        <p className={`text-lg font-bold ${delta === 0 ? 'text-slate-600' : better ? 'text-emerald-600' : worse ? 'text-red-600' : 'text-slate-600'}`}>
                          {delta > 0 ? '+' : ''}{typeof a === 'number' && typeof b === 'number' ? (b - a).toFixed(a % 1 !== 0 || b % 1 !== 0 ? 1 : 0) : '—'}
                        </p>
                        <p className="text-xs text-slate-400">{a} → {typeof b === 'number' ? b.toFixed(b % 1 !== 0 ? 1 : 0) : b}</p>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
