import { useEffect, useState } from 'react'
import api, { type ScheduleRun, type Assignment } from '../services/api'
import { PageHeader, Card, Badge, Spinner, EmptyState, Btn, Alert, ProgressBar } from '../components/UI'
import { format } from 'date-fns'
import { Play, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle } from 'lucide-react'

function statusColor(s: string) {
  if (s === 'APPROVED') return 'green'
  if (s === 'REJECTED') return 'red'
  if (s === 'PENDING_REVIEW') return 'yellow'
  return 'gray'
}
function solverColor(s: string) {
  if (s === 'OPTIMAL') return 'teal'
  if (s === 'FEASIBLE') return 'blue'
  if (s === 'INFEASIBLE') return 'red'
  return 'gray'
}

function AssignmentRow({ a }: { a: Assignment }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr className={`hover:bg-slate-50 transition-colors ${!a.is_scheduled ? 'bg-red-50/40' : ''}`}>
        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{a.task_id}</td>
        <td className="px-4 py-2.5">
          {a.is_scheduled
            ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={12} />Scheduled</span>
            : <span className="inline-flex items-center gap-1 text-xs text-red-700"><XCircle size={12} />Unscheduled</span>}
        </td>
        <td className="px-4 py-2.5 text-xs text-slate-600">{a.resource_id ?? <span className="text-slate-300">—</span>}</td>
        <td className="px-4 py-2.5 text-xs text-slate-600">{a.staff_id ?? <span className="text-slate-300">—</span>}</td>
        <td className="px-4 py-2.5 text-xs text-slate-600 tabular-nums">{a.start_time ? format(new Date(a.start_time), 'HH:mm') : '—'}</td>
        <td className="px-4 py-2.5 text-xs text-slate-600 tabular-nums">{a.end_time ? format(new Date(a.end_time), 'HH:mm') : '—'}</td>
        <td className="px-4 py-2.5">
          <button onClick={() => setOpen(o => !o)} className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="px-4 pb-3 pt-0">
            <div className={`text-xs p-3 rounded-lg leading-relaxed ${a.is_scheduled ? 'bg-teal-50 text-teal-800 border border-teal-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
              {a.is_scheduled ? a.explanation : (a.unscheduled_reason ?? 'No reason provided')}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function SchedulePlanner() {
  const [schedules, setSchedules] = useState<ScheduleRun[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selected, setSelected] = useState<ScheduleRun | null>(null)
  const [timeLimit, setTimeLimit] = useState(30)
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)

  const load = () => {
    setLoading(true)
    api.get('/schedules').then(r => { setSchedules(r.data); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const generate = async () => {
    setGenerating(true)
    setAlert(null)
    try {
      const r = await api.post('/schedules/generate', { time_limit_seconds: timeLimit })
      setAlert({ type: 'success', msg: `Schedule ${r.data.schedule_id} generated — ${r.data.scheduled_tasks}/${r.data.total_tasks} tasks scheduled (${r.data.solver_status}).` })
      load()
      const detail = await api.get(`/schedules/${r.data.schedule_id}`)
      setSelected(detail.data)
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Failed to generate schedule.' })
    }
    setGenerating(false)
  }

  const loadDetail = async (s: ScheduleRun) => {
    const r = await api.get(`/schedules/${s.schedule_id}`)
    setSelected(r.data)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Schedule Planner" subtitle="Generate constraint-based schedules using Google OR-Tools CP-SAT solver" />

      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Generator panel */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Generate New Schedule</h2>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Solver Time Limit (seconds)</label>
            <input type="number" min={5} max={120} value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <Btn onClick={generate} disabled={generating} className="w-full justify-center">
            <Play size={14} />{generating ? 'Running Solver...' : 'Generate Schedule'}
          </Btn>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-1">OR-Tools CP-SAT Engine</p>
            <p className="text-xs text-blue-600 leading-relaxed">Maximises weighted task coverage by priority. Enforces resource availability, staff skills, no-overlap, and deadline constraints.</p>
          </div>
        </Card>

        {/* History panel */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Schedule History</h2>
          {loading ? <Spinner size="sm" /> : schedules.length === 0 ? (
            <EmptyState message="No schedules generated yet. Click Generate to start." />
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {schedules.map(s => (
                <button key={s.id} onClick={() => loadDetail(s)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selected?.schedule_id === s.schedule_id ? 'border-teal-400 bg-teal-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-slate-700">{s.schedule_id}</span>
                    <Badge label={`v${s.version}`} color="blue" />
                    <Badge label={s.status} color={statusColor(s.status)} dot />
                    <Badge label={s.solver_status} color={solverColor(s.solver_status)} />
                    <span className="text-xs text-slate-400 ml-auto tabular-nums">{format(new Date(s.created_at), 'dd MMM HH:mm')}</span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={s.scheduled_tasks} max={s.total_tasks} color="teal" />
                    <p className="text-xs text-slate-500 mt-1">{s.scheduled_tasks}/{s.total_tasks} tasks · {s.runtime_seconds?.toFixed(2)}s</p>
                  </div>
                  {s.scenario_description && <p className="text-xs text-slate-400 mt-0.5 truncate">{s.scenario_description}</p>}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Selected schedule detail */}
      {selected && (
        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-sm font-semibold text-slate-800">{selected.schedule_id}</h2>
              <Badge label={`v${selected.version}`} color="blue" />
              <Badge label={selected.status} color={statusColor(selected.status)} dot />
              <Badge label={selected.solver_status} color={solverColor(selected.solver_status)} />
              {selected.objective_score != null && <span className="text-xs text-slate-500">Objective: {selected.objective_score.toFixed(1)}</span>}
              {selected.runtime_seconds != null && (
                <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={11} />{selected.runtime_seconds.toFixed(2)}s</span>
              )}
            </div>
          </div>

          {selected.scenario_description && (
            <div className="mx-5 mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Scenario:</strong> {selected.scenario_description}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 p-5">
            {[
              { label: 'Total Tasks', value: selected.total_tasks, color: 'text-slate-700', bg: 'bg-slate-50' },
              { label: 'Scheduled', value: selected.scheduled_tasks, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Unscheduled', value: selected.unscheduled_tasks, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`text-center p-4 rounded-xl ${bg}`}>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {selected.solver_status === 'FEASIBLE' && (
            <div className="mx-5 mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              ℹ️ Status is FEASIBLE — a valid schedule was found within the time limit but optimality was not proven. Increase the time limit for a potentially better result.
            </div>
          )}

          <div className="px-5 pb-5">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Task ID', 'Status', 'Resource', 'Staff', 'Start', 'End', 'Details'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selected.assignments.map(a => <AssignmentRow key={a.id} a={a} />)}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
