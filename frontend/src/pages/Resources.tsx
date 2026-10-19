import { useEffect, useState } from 'react'
import api, { type Resource } from '../services/api'
import { PageHeader, Card, Badge, Spinner, EmptyState, Modal, Input, Select, Btn, Table, Td, Alert, SearchInput, FilterSelect } from '../components/UI'
import { Plus, Edit2, Trash2, Eye } from 'lucide-react'

const TYPES = ['transport_vehicle', 'training_facility', 'maintenance_bay', 'fuel_depot', 'cargo_equipment', 'admin_facility']
const EMPTY = { resource_id: '', name: '', resource_type: 'transport_vehicle', capacity: 1, availability_status: 'available', maintenance_status: 'operational', availability_notes: '' }

function availColor(s: string) { return s === 'available' ? 'green' : s === 'unavailable' ? 'red' : 'yellow' }
function maintColor(s: string) { return s === 'operational' ? 'teal' : s === 'under_maintenance' ? 'red' : 'yellow' }

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selected, setSelected] = useState<Resource | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const load = () => {
    setLoading(true)
    const params: any = {}
    if (search) params.search = search
    if (filterType) params.resource_type = filterType
    api.get('/resources', { params })
      .then(r => { setResources(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filterType])

  const openAdd = () => { setForm({ ...EMPTY }); setModal('add') }
  const openEdit = (r: Resource) => {
    setSelected(r)
    setForm({ resource_id: r.resource_id, name: r.name, resource_type: r.resource_type, capacity: r.capacity, availability_status: r.availability_status, maintenance_status: r.maintenance_status, availability_notes: r.availability_notes ?? '' })
    setModal('edit')
  }
  const openView = (r: Resource) => { setSelected(r); setModal('view') }

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'add') await api.post('/resources', { ...form, capacity: Number(form.capacity) })
      else if (modal === 'edit' && selected) await api.put(`/resources/${selected.resource_id}`, { ...form, capacity: Number(form.capacity) })
      setModal(null)
      setAlert({ type: 'success', msg: modal === 'add' ? 'Resource created successfully.' : 'Resource updated successfully.' })
      load()
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Failed to save resource.' })
    }
    setSaving(false)
  }

  const deactivate = async (r: Resource) => {
    if (!confirm(`Deactivate "${r.name}"? It will be hidden from the system.`)) return
    try {
      await api.delete(`/resources/${r.resource_id}`)
      setAlert({ type: 'success', msg: `${r.name} deactivated.` })
      load()
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Failed to deactivate.' })
    }
  }

  const types = [...new Set(resources.map(r => r.resource_type))]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Resources"
        subtitle="Manage transport vehicles, training facilities, maintenance bays, and equipment"
        action={<Btn onClick={openAdd}><Plus size={14} />Add Resource</Btn>}
      />

      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      <Card className="mb-4 p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name or ID..." />
          </div>
          <FilterSelect value={filterType} onChange={setFilterType}>
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </FilterSelect>
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : resources.length === 0 ? (
          <EmptyState message="No resources found." action={<Btn onClick={openAdd}><Plus size={14} />Add Resource</Btn>} />
        ) : (
          <Table headers={['ID', 'Name', 'Type', 'Capacity', 'Availability', 'Maintenance', 'Actions']}>
            {resources.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <Td><span className="font-mono text-xs text-slate-500">{r.resource_id}</span></Td>
                <Td><span className="font-medium text-slate-900">{r.name}</span></Td>
                <Td><span className="text-slate-600">{r.resource_type.replace(/_/g, ' ')}</span></Td>
                <Td><span className="text-slate-600">{r.capacity}</span></Td>
                <Td><Badge label={r.availability_status} color={availColor(r.availability_status)} dot /></Td>
                <Td><Badge label={r.maintenance_status.replace(/_/g, ' ')} color={maintColor(r.maintenance_status)} /></Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => openView(r)} className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View"><Eye size={14} /></button>
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Edit"><Edit2 size={14} /></button>
                    <button onClick={() => deactivate(r)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Deactivate"><Trash2 size={14} /></button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {resources.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">{resources.length} resource{resources.length !== 1 ? 's' : ''}</div>
        )}
      </Card>

      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Add Resource' : 'Edit Resource'} onClose={() => setModal(null)}>
          <Input label="Resource ID" value={form.resource_id} onChange={e => setForm(f => ({ ...f, resource_id: e.target.value }))} disabled={modal === 'edit'} placeholder="e.g. RES-021" />
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Transport Truck Delta" />
          <Select label="Type" value={form.resource_type} onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}>
            {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </Select>
          <Input label="Capacity" type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
          <Select label="Availability Status" value={form.availability_status} onChange={e => setForm(f => ({ ...f, availability_status: e.target.value }))}>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="maintenance">Maintenance</option>
          </Select>
          <Select label="Maintenance Status" value={form.maintenance_status} onChange={e => setForm(f => ({ ...f, maintenance_status: e.target.value }))}>
            <option value="operational">Operational</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="scheduled_maintenance">Scheduled Maintenance</option>
          </Select>
          <Input label="Notes (optional)" value={form.availability_notes} onChange={e => setForm(f => ({ ...f, availability_notes: e.target.value }))} placeholder="Any additional notes..." />
          <div className="flex gap-2 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : modal === 'add' ? 'Create Resource' : 'Save Changes'}</Btn>
          </div>
        </Modal>
      )}

      {modal === 'view' && selected && (
        <Modal title="Resource Details" onClose={() => setModal(null)}>
          <dl className="space-y-3">
            {[
              ['Resource ID', <span className="font-mono text-sm">{selected.resource_id}</span>],
              ['Name', selected.name],
              ['Type', selected.resource_type.replace(/_/g, ' ')],
              ['Capacity', selected.capacity],
              ['Availability', <Badge label={selected.availability_status} color={availColor(selected.availability_status)} dot />],
              ['Maintenance', <Badge label={selected.maintenance_status.replace(/_/g, ' ')} color={maintColor(selected.maintenance_status)} />],
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
