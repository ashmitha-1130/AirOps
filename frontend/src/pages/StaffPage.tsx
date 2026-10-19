import { useEffect, useState } from 'react'
import api, { type Staff } from '../services/api'
import { PageHeader, Card, Badge, Spinner, EmptyState, Modal, Input, Select, Btn, Table, Td, Alert, SearchInput, FilterSelect } from '../components/UI'
import { Plus, Edit2, Trash2, Eye } from 'lucide-react'

const SKILLS = ['driving', 'logistics', 'instruction', 'maintenance', 'cargo_handling', 'operations', 'administration', 'fuel_handling']
const EMPTY = { staff_id: '', name: '', role: '', skill_category: 'driving', availability_status: 'available', availability_notes: '' }

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSkill, setFilterSkill] = useState('')
  const [filterAvail, setFilterAvail] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selected, setSelected] = useState<Staff | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const load = () => {
    setLoading(true)
    const params: any = {}
    if (search) params.search = search
    if (filterSkill) params.skill_category = filterSkill
    if (filterAvail) params.availability_status = filterAvail
    api.get('/staff', { params })
      .then(r => { setStaff(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filterSkill, filterAvail])

  const openAdd = () => { setForm({ ...EMPTY }); setModal('add') }
  const openEdit = (s: Staff) => {
    setSelected(s)
    setForm({ staff_id: s.staff_id, name: s.name, role: s.role, skill_category: s.skill_category, availability_status: s.availability_status, availability_notes: s.availability_notes ?? '' })
    setModal('edit')
  }
  const openView = (s: Staff) => { setSelected(s); setModal('view') }

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'add') await api.post('/staff', form)
      else if (modal === 'edit' && selected) await api.put(`/staff/${selected.staff_id}`, form)
      setModal(null)
      setAlert({ type: 'success', msg: modal === 'add' ? 'Staff member created.' : 'Staff member updated.' })
      load()
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Failed to save.' })
    }
    setSaving(false)
  }

  const deactivate = async (s: Staff) => {
    if (!confirm(`Deactivate ${s.name}?`)) return
    try {
      await api.delete(`/staff/${s.staff_id}`)
      setAlert({ type: 'success', msg: `${s.name} deactivated.` })
      load()
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Failed.' })
    }
  }

  const available = staff.filter(s => s.availability_status === 'available').length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Staff"
        subtitle="Manage personnel availability, roles, and skill categories"
        action={<Btn onClick={openAdd}><Plus size={14} />Add Staff</Btn>}
      />

      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {/* Summary */}
      {staff.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: 'Total Staff', value: staff.length, color: 'text-slate-800' },
            { label: 'Available', value: available, color: 'text-emerald-600' },
            { label: 'Unavailable', value: staff.length - available, color: 'text-red-600' },
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
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name or ID..." />
          </div>
          <FilterSelect value={filterSkill} onChange={setFilterSkill}>
            <option value="">All Skills</option>
            {SKILLS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </FilterSelect>
          <FilterSelect value={filterAvail} onChange={setFilterAvail}>
            <option value="">All Availability</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </FilterSelect>
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : staff.length === 0 ? (
          <EmptyState message="No staff found." action={<Btn onClick={openAdd}><Plus size={14} />Add Staff</Btn>} />
        ) : (
          <Table headers={['ID', 'Name', 'Role', 'Skill Category', 'Availability', 'Actions']}>
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <Td><span className="font-mono text-xs text-slate-500">{s.staff_id}</span></Td>
                <Td><span className="font-medium text-slate-900">{s.name}</span></Td>
                <Td><span className="text-slate-600">{s.role}</span></Td>
                <Td><Badge label={s.skill_category.replace(/_/g, ' ')} color="indigo" /></Td>
                <Td><Badge label={s.availability_status} color={s.availability_status === 'available' ? 'green' : 'red'} dot /></Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => openView(s)} className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye size={14} /></button>
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => deactivate(s)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {staff.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">{staff.length} staff member{staff.length !== 1 ? 's' : ''}</div>
        )}
      </Card>

      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Add Staff Member' : 'Edit Staff Member'} onClose={() => setModal(null)}>
          <Input label="Staff ID" value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))} disabled={modal === 'edit'} placeholder="e.g. STF-016" />
          <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cpl. Rahul Sharma" />
          <Input label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Driver" />
          <Select label="Skill Category" value={form.skill_category} onChange={e => setForm(f => ({ ...f, skill_category: e.target.value }))}>
            {SKILLS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select>
          <Select label="Availability Status" value={form.availability_status} onChange={e => setForm(f => ({ ...f, availability_status: e.target.value }))}>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </Select>
          <Input label="Notes (optional)" value={form.availability_notes} onChange={e => setForm(f => ({ ...f, availability_notes: e.target.value }))} placeholder="e.g. On leave until..." />
          <div className="flex gap-2 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : modal === 'add' ? 'Create Staff' : 'Save Changes'}</Btn>
          </div>
        </Modal>
      )}

      {modal === 'view' && selected && (
        <Modal title="Staff Details" onClose={() => setModal(null)}>
          <dl className="space-y-3">
            {[
              ['Staff ID', <span className="font-mono text-sm">{selected.staff_id}</span>],
              ['Name', selected.name],
              ['Role', selected.role],
              ['Skill Category', <Badge label={selected.skill_category.replace(/_/g, ' ')} color="indigo" />],
              ['Availability', <Badge label={selected.availability_status} color={selected.availability_status === 'available' ? 'green' : 'red'} dot />],
              ['Notes', selected.availability_notes || '—'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex gap-3">
                <dt className="text-xs font-semibold text-slate-500 w-28 shrink-0 pt-0.5">{k}</dt>
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
