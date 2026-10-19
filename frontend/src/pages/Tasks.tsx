import { useEffect, useState } from 'react'
import api, { type Task } from '../services/api'
import { PageHeader, Card, Badge, Spinner, EmptyState, Modal, Input, Select, Btn, Table, Td, Alert, SearchInput, FilterSelect } from '../components/UI'
import { Plus, Edit2, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'

const CATS = ['training', 'routine_transportation', 'maintenance_coordination', 'general_logistics']
const SKILLS = ['', 'driving', 'logistics', 'instruction', 'maintenance', 'cargo_handling', 'operations', 'administration', 'fuel_handling']
const RTYPES = ['transport_vehicle', 'training_facility', 'maintenance_bay', 'fuel_depot', 'cargo_equipment', 'admin_facility']
const EMPTY = { task_id: '', title: '', category: 'training', description: '', duration_minutes: 60, priority: 3, earliest_start: '', deadline: '', required_resource_type: 'transport_vehicle', required_skill: '' }

function priorityBadge(p: number) {
  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'P1 Critical', color: 'red' },
    2: { label: 'P2 High', color: 'orange' },
    3: { label: 'P3 Medium', color: 'yellow' },
    4: { label: 'P4 Low', color: 'blue' },
    5: { label: 'P5 Minimal', color: 'gray' },
  }
  return map[p] ?? { label: `P${p}`, color: 'gray' }
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selected, setSelected] = useState<Task | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const load = () => {
    setLoading(true)
    const params: any = {}
    if (search) params.search = search
    if (filterCat) params.category = filterCat
    if (filterStatus) params.scheduling_status = filterStatus
    api.get('/tasks', { params })
      .then(r => { setTasks(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filterCat, filterStatus])

  const openAdd = () => { setForm({ ...EMPTY }); setModal('add') }
  const openEdit = (t: Task) => {
    setSelected(t)
    setForm({ task_id: t.task_id, title: t.title, category: t.category, description: t.description ?? '', duration_minutes: t.duration_minutes, priority: t.priority, earliest_start: t.earliest_start.slice(0, 16), deadline: t.deadline.slice(0, 16), required_resource_type: t.required_resource_type, required_skill: t.required_skill ?? '' })
    setModal('edit')
  }
  const openView = (t: Task) => { setSelected(t); setModal('view') }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, duration_minutes: Number(form.duration_minutes), priority: Number(form.priority), earliest_start: new Date(form.earliest_start).toISOString(), deadline: new Date(form.deadline).toISOString(), required_skill: form.required_skill || null }
      if (modal === 'add') await api.post('/tasks', payload)
      else if (modal === 'edit' && selected) await api.put(`/tasks/${selected.task_id}`, payload)
      setModal(null)
      setAlert({ type: 'success', msg: modal === 'add' ? 'Task created.' : 'Task updated.' })
      load()
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Failed to save task.' })
    }
    setSaving(false)
  }

  const deactivate = async (t: Task) => {
    if (!confirm(`Deactivate task "${t.title}"?`)) return
    try {
      await api.delete(`/tasks/${t.task_id}`)
      setAlert({ type: 'success', msg: `Task "${t.title}" deactivated.` })
      load()
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Failed.' })
    }
  }

  const scheduled = tasks.filter(t => t.scheduling_status === 'scheduled').length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tasks"
        subtitle="Manage training, transport, maintenance, and logistics tasks"
        action={<Btn onClick={openAdd}><Plus size={14} />Add Task</Btn>}
      />

      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {tasks.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Total', value: tasks.length, color: 'text-slate-800' },
            { label: 'Scheduled', value: scheduled, color: 'text-emerald-600' },
            { label: 'Unscheduled', value: tasks.length - scheduled, color: 'text-amber-600' },
            { label: 'Critical (P1)', value: tasks.filter(t => t.priority === 1).length, color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="mb-4 p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by title or ID..." />
          </div>
          <FilterSelect value={filterCat} onChange={setFilterCat}>
            <option value="">All Categories</option>
            {CATS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </FilterSelect>
          <FilterSelect value={filterStatus} onChange={setFilterStatus}>
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="unscheduled">Unscheduled</option>
          </FilterSelect>
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : tasks.length === 0 ? (
          <EmptyState message="No tasks found." action={<Btn onClick={openAdd}><Plus size={14} />Add Task</Btn>} />
        ) : (
          <Table headers={['ID', 'Title', 'Category', 'Duration', 'Priority', 'Deadline', 'Status', 'Actions']}>
            {tasks.map(t => {
              const pb = priorityBadge(t.priority)
              return (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <Td><span className="font-mono text-xs text-slate-500">{t.task_id}</span></Td>
                  <Td><span className="font-medium text-slate-900 max-w-xs block truncate">{t.title}</span></Td>
                  <Td><span className="text-slate-600 text-xs">{t.category.replace(/_/g, ' ')}</span></Td>
                  <Td><span className="text-slate-600">{t.duration_minutes}m</span></Td>
                  <Td><Badge label={pb.label} color={pb.color} /></Td>
                  <Td><span className="text-slate-600 text-xs tabular-nums">{format(new Date(t.deadline), 'dd MMM HH:mm')}</span></Td>
                  <Td><Badge label={t.scheduling_status} color={t.scheduling_status === 'scheduled' ? 'green' : 'gray'} dot /></Td>
                  <Td>
                    <div className="flex gap-1">
                      <button onClick={() => openView(t)} className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye size={14} /></button>
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => deactivate(t)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </Td>
                </tr>
              )
            })}
          </Table>
        )}
        {tasks.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</div>
        )}
      </Card>

      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Add Task' : 'Edit Task'} onClose={() => setModal(null)}>
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-0">
            <Input label="Task ID" value={form.task_id} onChange={e => setForm(f => ({ ...f, task_id: e.target.value }))} disabled={modal === 'edit'} placeholder="e.g. TSK-031" />
            <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Morning Logistics Briefing" />
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Duration (minutes)" type="number" min={1} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
              <Input label="Priority (1=highest)" type="number" min={1} max={5} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} />
            </div>
            <Input label="Earliest Start" type="datetime-local" value={form.earliest_start} onChange={e => setForm(f => ({ ...f, earliest_start: e.target.value }))} />
            <Input label="Deadline" type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            <Select label="Required Resource Type" value={form.required_resource_type} onChange={e => setForm(f => ({ ...f, required_resource_type: e.target.value }))}>
              {RTYPES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </Select>
            <Select label="Required Skill (optional)" value={form.required_skill} onChange={e => setForm(f => ({ ...f, required_skill: e.target.value }))}>
              {SKILLS.map(s => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'None'}</option>)}
            </Select>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 mt-4">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : modal === 'add' ? 'Create Task' : 'Save Changes'}</Btn>
          </div>
        </Modal>
      )}

      {modal === 'view' && selected && (
        <Modal title="Task Details" onClose={() => setModal(null)}>
          <dl className="space-y-3">
            {[
              ['Task ID', <span className="font-mono text-sm">{selected.task_id}</span>],
              ['Title', selected.title],
              ['Category', selected.category.replace(/_/g, ' ')],
              ['Duration', `${selected.duration_minutes} minutes`],
              ['Priority', <Badge label={priorityBadge(selected.priority).label} color={priorityBadge(selected.priority).color} />],
              ['Earliest Start', format(new Date(selected.earliest_start), 'dd MMM yyyy HH:mm')],
              ['Deadline', format(new Date(selected.deadline), 'dd MMM yyyy HH:mm')],
              ['Resource Type', selected.required_resource_type.replace(/_/g, ' ')],
              ['Required Skill', selected.required_skill?.replace(/_/g, ' ') || '—'],
              ['Status', <Badge label={selected.scheduling_status} color={selected.scheduling_status === 'scheduled' ? 'green' : 'gray'} dot />],
              ['Description', selected.description || '—'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex gap-3">
                <dt className="text-xs font-semibold text-slate-500 w-32 shrink-0 pt-0.5">{k}</dt>
                <dd className="text-sm text-slate-800">{v as any}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end mt-5 gap-2">
            <Btn variant="secondary" onClick={() => { setModal(null); openEdit(selected) }}>Edit</Btn>
            <Btn variant="secondary" onClick={() => setModal(null)}>Close</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
