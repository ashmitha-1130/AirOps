import { useEffect, useState } from 'react'
import api, { type Resource, type Staff, type ScheduleRun } from '../services/api'
import { PageHeader, Card, Badge, Spinner, Btn, Alert, ProgressBar } from '../components/UI'
import { FlaskConical, AlertTriangle, CheckCircle2 } from 'lucide-react'

function statusColor(s: string) {
  if (s === 'APPROVED') return 'green'
  if (s === 'REJECTED') return 'red'
  if (s === 'PENDING_REVIEW') return 'yellow'
  return 'gray'
}

export default function ScenarioSimulator() {
  const [resources, setResources] = useState<Resource[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [schedules, setSchedules] = useState<ScheduleRun[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const [form, setForm] = useState({
    description: '',
    resource_unavailable: '',
    staff_unavailable: '',
    parent_schedule_id: '',
    add_maintenance: false,
    maint_entity_id: '',
    maint_start: '',
    maint_end: '',
    maint_reason: '',
  })

  useEffect(() => {
    Promise.all([api.get('/resources'), api.get('/staff'), api.get('/schedules')])
      .then(([r, s, sc]) => { setResources(r.data); setStaff(s.data); setSchedules(sc.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const run = async () => {
    if (!form.description.trim()) { setAlert({ type: 'error', msg: 'Please provide a scenario description.' }); return }
    setRunning(true); setAlert(null); setResult(null)
    try {
      const payload: any = { description: form.description }
      if (form.resource_unavailable) payload.resource_unavailable = form.resource_unavailable
      if (form.staff_unavailable) payload.staff_unavailable = form.staff_unavailable
      if (form.parent_schedule_id) payload.parent_schedule_id = form.parent_schedule_id
      if (form.add_maintenance && form.maint_entity_id && form.maint_start && form.maint_end) {
        payload.maintenance_window = {
          entity_type: 'resource', entity_id: form.maint_entity_id,
          start_time: new Date(form.maint_start).toISOString(),
          end_time: new Date(form.maint_end).toISOString(),
          reason: form.maint_reason || form.description,
        }
      }
      const r = await api.post('/scenarios', payload)
      setResult(r.data)
      setAlert({ type: 'success', msg: `Scenario executed. New schedule ${r.data.new_schedule?.schedule_id} generated.` })
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Scenario failed.' })
    }
    setRunning(false)
  }

  if (loading) return <div className="p-8"><Spinner /></div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Scenario Simulator" subtitle="Simulate resource outages, staff unavailability, and maintenance windows — then regenerate the schedule" />

      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <FlaskConical size={16} className="text-teal-600" />Configure Scenario
          </h2>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Scenario Description <span className="text-red-500">*</span></label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Transport Truck Alpha breakdown scenario"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mark Resource Unavailable</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              value={form.resource_unavailable} onChange={e => setForm(f => ({ ...f, resource_unavailable: e.target.value }))}>
              <option value="">— None —</option>
              {resources.filter(r => r.availability_status === 'available').map(r => (
                <option key={r.resource_id} value={r.resource_id}>{r.resource_id} — {r.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mark Staff Unavailable</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              value={form.staff_unavailable} onChange={e => setForm(f => ({ ...f, staff_unavailable: e.target.value }))}>
              <option value="">— None —</option>
              {staff.filter(s => s.availability_status === 'available').map(s => (
                <option key={s.staff_id} value={s.staff_id}>{s.staff_id} — {s.name} ({s.skill_category})</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded" checked={form.add_maintenance} onChange={e => setForm(f => ({ ...f, add_maintenance: e.target.checked }))} />
              Add Maintenance Window Constraint
            </label>
            {form.add_maintenance && (
              <div className="mt-3 space-y-2 pl-4 border-l-2 border-teal-200">
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  value={form.maint_entity_id} onChange={e => setForm(f => ({ ...f, maint_entity_id: e.target.value }))}>
                  <option value="">Select Resource</option>
                  {resources.map(r => <option key={r.resource_id} value={r.resource_id}>{r.resource_id} — {r.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="datetime-local" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.maint_start} onChange={e => setForm(f => ({ ...f, maint_start: e.target.value }))} />
                  <input type="datetime-local" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.maint_end} onChange={e => setForm(f => ({ ...f, maint_end: e.target.value }))} />
                </div>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Reason" value={form.maint_reason} onChange={e => setForm(f => ({ ...f, maint_reason: e.target.value }))} />
              </div>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Base Schedule (for versioning)</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              value={form.parent_schedule_id} onChange={e => setForm(f => ({ ...f, parent_schedule_id: e.target.value }))}>
              <option value="">— None —</option>
              {schedules.map(s => <option key={s.schedule_id} value={s.schedule_id}>{s.schedule_id} (v{s.version}) — {s.status}</option>)}
            </select>
          </div>

          <Btn onClick={run} disabled={running} className="w-full justify-center">
            <FlaskConical size={14} />{running ? 'Running Scenario...' : 'Run Scenario & Regenerate Schedule'}
          </Btn>
        </Card>

        {/* Results */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Scenario Results</h2>
          {!result ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FlaskConical size={32} className="mb-3 text-slate-300" />
              <p className="text-sm">Configure and run a scenario to see results here.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Changes applied */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Changes Applied</p>
                {result.changes_applied?.length === 0 ? (
                  <p className="text-xs text-slate-400">No state changes applied.</p>
                ) : (
                  <div className="space-y-1.5">
                    {result.changes_applied?.map((c: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                        <AlertTriangle size={12} className="shrink-0" />{c}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New schedule */}
              {result.new_schedule && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">New Schedule Generated</p>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-slate-800">{result.new_schedule.schedule_id}</span>
                      <Badge label={`v${result.new_schedule.version}`} color="blue" />
                      <Badge label={result.new_schedule.status} color={statusColor(result.new_schedule.status)} dot />
                      <Badge label={result.new_schedule.solver_status} color={result.new_schedule.solver_status === 'OPTIMAL' ? 'teal' : 'blue'} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Total', value: result.new_schedule.total_tasks, color: 'text-slate-700', bg: 'bg-white' },
                        { label: 'Scheduled', value: result.new_schedule.scheduled_tasks, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Unscheduled', value: result.new_schedule.unscheduled_tasks, color: 'text-red-600', bg: 'bg-red-50' },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`p-2 rounded-lg ${bg}`}>
                          <p className={`text-xl font-bold ${color}`}>{value}</p>
                          <p className="text-xs text-slate-500">{label}</p>
                        </div>
                      ))}
                    </div>
                    <ProgressBar value={result.new_schedule.scheduled_tasks} max={result.new_schedule.total_tasks} color="teal" />
                    <p className="text-xs text-slate-500">Runtime: {result.new_schedule.runtime_seconds?.toFixed(2)}s · Objective: {result.new_schedule.objective_score?.toFixed(1) ?? 'N/A'}</p>
                  </div>

                  {/* Unscheduled explanations */}
                  {result.new_schedule.assignments?.filter((a: any) => !a.is_scheduled).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Constraint Violations</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {result.new_schedule.assignments?.filter((a: any) => !a.is_scheduled).map((a: any) => (
                          <div key={a.id} className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                            <span className="font-mono text-xs text-red-700 shrink-0">{a.task_id}</span>
                            <span className="text-xs text-red-600">{a.unscheduled_reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.new_schedule.assignments?.filter((a: any) => !a.is_scheduled).length === 0 && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700">
                      <CheckCircle2 size={13} />All tasks scheduled successfully.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
