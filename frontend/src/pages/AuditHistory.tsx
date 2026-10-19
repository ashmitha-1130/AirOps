import { useEffect, useState } from 'react'
import api, { type AuditLog } from '../services/api'
import { PageHeader, Card, Badge, Spinner, EmptyState, SearchInput, FilterSelect } from '../components/UI'
import { format } from 'date-fns'

const EVENT_COLORS: Record<string, string> = {
  SCHEDULE_APPROVED: 'green', SCHEDULE_REJECTED: 'red', SCHEDULE_GENERATED: 'blue',
  RESOURCE_CREATED: 'teal', RESOURCE_UPDATED: 'teal', RESOURCE_DEACTIVATED: 'gray',
  STAFF_CREATED: 'purple', STAFF_UPDATED: 'purple', STAFF_DEACTIVATED: 'gray',
  TASK_CREATED: 'blue', TASK_UPDATED: 'blue', TASK_DEACTIVATED: 'gray',
  CSV_IMPORT: 'orange', SEED_DATA_LOADED: 'teal',
  SCENARIO_RESOURCE_UNAVAILABLE: 'yellow', SCENARIO_STAFF_UNAVAILABLE: 'yellow',
  CONSTRAINT_CREATED: 'indigo',
}

const EVENT_TYPES = [
  'SCHEDULE_GENERATED', 'SCHEDULE_APPROVED', 'SCHEDULE_REJECTED',
  'RESOURCE_CREATED', 'RESOURCE_UPDATED', 'RESOURCE_DEACTIVATED',
  'STAFF_CREATED', 'STAFF_UPDATED', 'STAFF_DEACTIVATED',
  'TASK_CREATED', 'TASK_UPDATED', 'TASK_DEACTIVATED',
  'CSV_IMPORT', 'SEED_DATA_LOADED',
  'SCENARIO_RESOURCE_UNAVAILABLE', 'SCENARIO_STAFF_UNAVAILABLE',
]

export default function AuditHistory() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    api.get('/audit?limit=200')
      .then(r => { setLogs(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.description.toLowerCase().includes(search.toLowerCase()) || l.entity_id.toLowerCase().includes(search.toLowerCase()) || l.actor.toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || l.event_type === filterType
    return matchSearch && matchType
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Audit History" subtitle="Complete audit trail of all system events, decisions, and data changes" />

      <Card className="mb-4 p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by description, entity ID, or actor..." />
          </div>
          <FilterSelect value={filterType} onChange={setFilterType}>
            <option value="">All Event Types</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </FilterSelect>
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState message={logs.length === 0 ? 'No audit events recorded yet.' : 'No events match your filters.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Time', 'Event', 'Entity', 'ID', 'Actor', 'Description'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap tabular-nums">{format(new Date(l.created_at), 'dd MMM HH:mm:ss')}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><Badge label={l.event_type.replace(/_/g, ' ')} color={EVENT_COLORS[l.event_type] ?? 'gray'} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500 capitalize">{l.entity_type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{l.entity_id}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{l.actor}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-sm truncate" title={l.description}>{l.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
              Showing {filtered.length} of {logs.length} events
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
