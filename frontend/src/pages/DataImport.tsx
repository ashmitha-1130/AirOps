import { useState } from 'react'
import api from '../services/api'
import { PageHeader, Card, Btn, Badge } from '../components/UI'
import { Upload, Download, CheckCircle2, XCircle, FileText } from 'lucide-react'

const TEMPLATES = {
  resources: 'resource_id,name,resource_type,capacity,availability_status,maintenance_status,availability_notes\nRES-NEW-001,New Vehicle,transport_vehicle,5,available,operational,\n',
  staff: 'staff_id,name,role,skill_category,availability_status,availability_notes\nSTF-NEW-001,New Person,Driver,driving,available,\n',
  tasks: 'task_id,title,category,description,duration_minutes,priority,earliest_start,deadline,required_resource_type,required_skill\nTSK-NEW-001,New Task,training,Description,60,3,2026-07-14T06:00:00+00:00,2026-07-14T14:00:00+00:00,training_facility,instruction\n',
}

type EntityType = 'resources' | 'staff' | 'tasks'

const ENTITY_INFO: Record<EntityType, { label: string; required: string[]; color: string }> = {
  resources: { label: 'Resources', required: ['resource_id', 'name', 'resource_type', 'capacity', 'availability_status', 'maintenance_status'], color: 'blue' },
  staff:     { label: 'Staff',     required: ['staff_id', 'name', 'role', 'skill_category', 'availability_status'], color: 'purple' },
  tasks:     { label: 'Tasks',     required: ['task_id', 'title', 'category', 'duration_minutes', 'priority', 'earliest_start', 'deadline', 'required_resource_type'], color: 'teal' },
}

export default function DataImport() {
  const [entity, setEntity] = useState<EntityType>('resources')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const download = (type: EntityType) => {
    const blob = new Blob([TEMPLATES[type]], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${type}_template.csv`
    a.click()
  }

  const upload = async () => {
    if (!file) return
    setLoading(true); setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await api.post(`/import/csv/${entity}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(r.data)
    } catch (e: any) {
      setResult({ status: 'error', error: e.response?.data?.detail || 'Upload failed' })
    }
    setLoading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) setFile(f)
  }

  const info = ENTITY_INFO[entity]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Data Import" subtitle="Bulk-import resources, staff, and tasks via CSV files" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Upload CSV File</h2>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Entity Type</label>
            <div className="flex gap-2">
              {(Object.keys(ENTITY_INFO) as EntityType[]).map(t => (
                <button key={t} onClick={() => { setEntity(t); setFile(null); setResult(null) }}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${entity === t ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {ENTITY_INFO[t].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Required Columns</label>
            <div className="flex flex-wrap gap-1">
              {info.required.map(c => <Badge key={c} label={c} color={info.color} />)}
            </div>
          </div>

          <div
            className={`mb-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-teal-400 bg-teal-50' : file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csv-upload')?.click()}
          >
            <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null) }} />
            {file ? (
              <>
                <FileText size={28} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-emerald-700">{file.name}</p>
                <p className="text-xs text-emerald-600 mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
              </>
            ) : (
              <>
                <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600">Drop CSV file here or <span className="text-teal-600 font-medium">click to browse</span></p>
                <p className="text-xs text-slate-400 mt-1">Only .csv files accepted</p>
              </>
            )}
          </div>

          <Btn onClick={upload} disabled={!file || loading} className="w-full justify-center">
            <Upload size={14} />{loading ? 'Importing...' : `Import ${info.label}`}
          </Btn>

          {result && (
            <div className={`mt-4 p-4 rounded-xl border ${result.status === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              {result.status === 'success' ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Import Successful</p>
                    <p className="text-sm text-emerald-600">{result.imported} records imported · {result.skipped} skipped (duplicates)</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <XCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Import Failed</p>
                    {result.error && <p className="text-sm text-red-600">{result.error}</p>}
                    {result.errors?.map((e: any, i: number) => (
                      <p key={i} className="text-xs text-red-600 mt-1">Row {e.row}: {e.errors.join(', ')}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Templates */}
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Download Templates</h2>
            <p className="text-sm text-slate-500 mb-4">Download CSV templates with correct column headers and example rows.</p>
            <div className="space-y-2">
              {(Object.keys(ENTITY_INFO) as EntityType[]).map(t => (
                <button key={t} onClick={() => download(t)}
                  className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 text-left transition-all">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                    <Download size={14} className="text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{ENTITY_INFO[t].label} Template</p>
                    <p className="text-xs text-slate-400">{t}_template.csv</p>
                  </div>
                  <Badge label={`${ENTITY_INFO[t].required.length} cols`} color={ENTITY_INFO[t].color} />
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Validation Rules</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              {[
                'All required columns must be present in the CSV header',
                'Duplicate IDs are skipped silently (not treated as errors)',
                'Invalid status values cause the row to be rejected',
                'Invalid datetime formats cause the row to be rejected',
                'If any row has errors, the entire import is rolled back',
                'Successful imports are logged in the audit trail',
              ].map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
