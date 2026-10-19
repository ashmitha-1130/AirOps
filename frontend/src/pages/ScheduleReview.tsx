import { useEffect, useState } from 'react'
import api, { type ScheduleRun } from '../services/api'
import { PageHeader, Card, Badge, Spinner, EmptyState, Modal, Input, Btn, Alert, ProgressBar } from '../components/UI'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

function statusColor(s: string) {
  if (s === 'APPROVED') return 'green'
  if (s === 'REJECTED') return 'red'
  if (s === 'PENDING_REVIEW') return 'yellow'
  return 'gray'
}

export default function ScheduleReview() {
  const [schedules, setSchedules] = useState<ScheduleRun[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ScheduleRun | null>(null)
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [reviewerId, setReviewerId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const load = () => {
    setLoading(true)
    api.get('/schedules').then(r => { setSchedules(r.data); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const loadDetail = async (s: ScheduleRun) => {
    const r = await api.get(`/schedules/${s.schedule_id}`)
    setSelected(r.data)
  }

  const approve = async () => {
    if (!reviewerId.trim()) { setAlert({ type: 'error', msg: 'Reviewer ID is required.' }); return }
    setSaving(true)
    try {
      await api.post(`/schedules/${selected!.schedule_id}/approve`, { reviewer_id: reviewerId })
      setModal(null)
      setAlert({ type: 'success', msg: `Schedule ${selected!.schedule_id} approved by ${reviewerId}.` })
      load()
      loadDetail(selected!)
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Failed to approve.' })
    }
    setSaving(false)
  }

  const reject = async () => {
    if (!reviewerId.trim() || !rejectReason.trim()) { setAlert({ type: 'error', msg: 'Reviewer ID and reason are required.' }); return }
    setSaving(true)
    try {
      await api.post(`/schedules/${selected!.schedule_id}/reject`, { reviewer_id: reviewerId, reason: rejectReason })
      setModal(null)
      setAlert({ type: 'success', msg: `Schedule ${selected!.schedule_id} rejected.` })
      load()
      loadDetail(selected!)
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Failed to reject.' })
    }
    setSaving(false)
  }

  const pending = schedules.filter(s => s.status === 'PENDING_REVIEW')
  const reviewed = schedules.filter(s => s.status !== 'PENDING_REVIEW')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Schedule Review" subtitle="Approve or reject generated schedules. All decisions require a reviewer ID and are logged." />

      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
        <span className="text-amber-500 mt-0.5">⚠️</span>
        <span>Prototype: This approval mechanism is for demonstration purposes. Production deployments require proper authentication and authorisation.</span>
      </div>

      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule list */}
        <div className="space-y-4">
          {loading ? <Spinner size="sm" /> : (
            <>
              {pending.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pending Review ({pending.length})</p>
                  {pending.map(s => (
                    <button key={s.id} onClick={() => loadDetail(s)}
                      className={`w-full text-left px-4 py-3 rounded-xl border mb-2 transition-all ${selected?.schedule_id === s.schedule_id ? 'border-teal-400 bg-teal-50' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{s.schedule_id}</span>
                        <Badge label={`v${s.version}`} color="blue" />
                      </div>
                      <ProgressBar value={s.scheduled_tasks} max={s.total_tasks} color="teal" />
                      <p className="text-xs text-slate-500 mt-1">{s.scheduled_tasks}/{s.total_tasks} · {format(new Date(s.created_at), 'dd MMM HH:mm')}</p>
                    </button>
                  ))}
                </div>
              )}
              {reviewed.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reviewed ({reviewed.length})</p>
                  {reviewed.map(s => (
                    <button key={s.id} onClick={() => loadDetail(s)}
                      className={`w-full text-left px-4 py-3 rounded-xl border mb-2 transition-all ${selected?.schedule_id === s.schedule_id ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{s.schedule_id}</span>
                        <Badge label={s.status} color={statusColor(s.status)} dot />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{s.reviewer_id} · {s.reviewed_at ? format(new Date(s.reviewed_at), 'dd MMM HH:mm') : ''}</p>
                    </button>
                  ))}
                </div>
              )}
              {schedules.length === 0 && <EmptyState message="No schedules to review." />}
            </>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card className="p-12 text-center">
              <p className="text-slate-400 text-sm">Select a schedule from the list to review its details.</p>
            </Card>
          ) : (
            <Card>
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-semibold text-slate-800">{selected.schedule_id}</h2>
                  <Badge label={`v${selected.version}`} color="blue" />
                  <Badge label={selected.status} color={statusColor(selected.status)} dot />
                  <Badge label={selected.solver_status} color="blue" />
                  {selected.runtime_seconds != null && (
                    <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto"><Clock size={11} />{selected.runtime_seconds.toFixed(2)}s</span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Total', value: selected.total_tasks, color: 'text-slate-700', bg: 'bg-slate-50' },
                    { label: 'Scheduled', value: selected.scheduled_tasks, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Unscheduled', value: selected.unscheduled_tasks, color: 'text-red-600', bg: 'bg-red-50' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`text-center p-3 rounded-xl ${bg}`}>
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {selected.scenario_description && (
                  <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <strong>Scenario:</strong> {selected.scenario_description}
                  </div>
                )}

                {selected.status === 'APPROVED' && (
                  <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    Approved by <strong>{selected.reviewer_id}</strong> on {selected.reviewed_at ? format(new Date(selected.reviewed_at), 'dd MMM yyyy HH:mm') : ''}
                  </div>
                )}
                {selected.status === 'REJECTED' && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center gap-2">
                    <XCircle size={16} className="text-red-600 shrink-0" />
                    Rejected by <strong>{selected.reviewer_id}</strong>: {selected.review_notes}
                  </div>
                )}

                {/* Assignments table */}
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 mb-5">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {['Task', 'Status', 'Resource', 'Staff', 'Start', 'End'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selected.assignments.map(a => (
                        <tr key={a.id} className={`${!a.is_scheduled ? 'bg-red-50/40' : 'hover:bg-slate-50'} transition-colors`}>
                          <td className="px-3 py-2 font-mono">{a.task_id}</td>
                          <td className="px-3 py-2">
                            {a.is_scheduled
                              ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} />OK</span>
                              : <span className="text-red-600 flex items-center gap-1"><XCircle size={11} />Fail</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{a.resource_id ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{a.staff_id ?? '—'}</td>
                          <td className="px-3 py-2 tabular-nums">{a.start_time ? format(new Date(a.start_time), 'HH:mm') : '—'}</td>
                          <td className="px-3 py-2 tabular-nums">{a.end_time ? format(new Date(a.end_time), 'HH:mm') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selected.status === 'PENDING_REVIEW' && (
                  <div className="flex gap-3">
                    <Btn variant="success" onClick={() => { setReviewerId(''); setAlert(null); setModal('approve') }}>
                      <CheckCircle2 size={14} />Approve Schedule
                    </Btn>
                    <Btn variant="danger" onClick={() => { setReviewerId(''); setRejectReason(''); setAlert(null); setModal('reject') }}>
                      <XCircle size={14} />Reject Schedule
                    </Btn>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {modal === 'approve' && (
        <Modal title="Approve Schedule" onClose={() => setModal(null)} size="sm">
          <p className="text-sm text-slate-600 mb-4">Confirm approval of <strong>{selected?.schedule_id}</strong>. This action will be logged.</p>
          <Input label="Reviewer ID" placeholder="e.g. MAJ-VERMA-001" value={reviewerId} onChange={e => setReviewerId(e.target.value)} />
          <div className="flex gap-2 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="success" onClick={approve} disabled={saving}>{saving ? 'Approving...' : 'Confirm Approve'}</Btn>
          </div>
        </Modal>
      )}

      {modal === 'reject' && (
        <Modal title="Reject Schedule" onClose={() => setModal(null)} size="sm">
          <p className="text-sm text-slate-600 mb-4">Reject <strong>{selected?.schedule_id}</strong>. A reason is required and will be logged.</p>
          <Input label="Reviewer ID" placeholder="e.g. MAJ-VERMA-001" value={reviewerId} onChange={e => setReviewerId(e.target.value)} />
          <Input label="Rejection Reason" placeholder="Explain why this schedule is rejected" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div className="flex gap-2 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={reject} disabled={saving}>{saving ? 'Rejecting...' : 'Confirm Reject'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
