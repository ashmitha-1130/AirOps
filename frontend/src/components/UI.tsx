import React from 'react'
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'

// ── Badge ──────────────────────────────────────────────────────────────────
const BADGE_STYLES: Record<string, string> = {
  green:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  red:    'bg-red-50 text-red-700 ring-1 ring-red-200',
  yellow: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  blue:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  gray:   'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  teal:   'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
}
export function Badge({ label, color = 'gray', dot }: { label: string; color?: string; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_STYLES[color] ?? BADGE_STYLES.gray}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${color === 'green' ? 'bg-emerald-500' : color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-amber-500' : 'bg-blue-500'}`} />}
      {label}
    </span>
  )
}

// ── PageHeader ─────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0 ml-4">{action}</div>}
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

// ── StatCard ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'blue', icon }: {
  label: string; value: number | string; sub?: string; color?: string; icon?: React.ReactNode
}) {
  const accent: Record<string, string> = {
    blue: 'text-blue-600', teal: 'text-teal-600', green: 'text-emerald-600',
    red: 'text-red-600', yellow: 'text-amber-600', purple: 'text-purple-600', indigo: 'text-indigo-600',
  }
  const bg: Record<string, string> = {
    blue: 'bg-blue-50', teal: 'bg-teal-50', green: 'bg-emerald-50',
    red: 'bg-red-50', yellow: 'bg-amber-50', purple: 'bg-purple-50', indigo: 'bg-indigo-50',
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-3xl font-bold ${accent[color] ?? accent.blue}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-lg ${bg[color] ?? bg.blue}`}>
            <span className={accent[color] ?? accent.blue}>{icon}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4 border-2' : size === 'lg' ? 'w-12 h-12 border-4' : 'w-8 h-8 border-3'
  return (
    <div className="flex items-center justify-center py-12">
      <div className={`${s} border-teal-500 border-t-transparent rounded-full animate-spin`} />
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Info size={24} className="text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-500 mb-1">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Alert ──────────────────────────────────────────────────────────────────
export function Alert({ type, message, onClose }: { type: 'success' | 'error' | 'info' | 'warning'; message: string; onClose?: () => void }) {
  const styles = {
    success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> },
    error:   { bg: 'bg-red-50 border-red-200',         text: 'text-red-800',     icon: <XCircle size={16} className="text-red-600 shrink-0" /> },
    info:    { bg: 'bg-blue-50 border-blue-200',        text: 'text-blue-800',    icon: <Info size={16} className="text-blue-600 shrink-0" /> },
    warning: { bg: 'bg-amber-50 border-amber-200',      text: 'text-amber-800',   icon: <AlertCircle size={16} className="text-amber-600 shrink-0" /> },
  }
  const s = styles[type]
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border ${s.bg} mb-4`}>
      {s.icon}
      <p className={`text-sm flex-1 ${s.text}`}>{message}</p>
      {onClose && <button onClick={onClose} className={`${s.text} opacity-60 hover:opacity-100 ml-2`}>&times;</button>}
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ title, children, onClose, size = 'md' }: {
  title: string; children: React.ReactNode; onClose: () => void; size?: 'sm' | 'md' | 'lg'
}) {
  const w = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${w} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">&times;</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ── Input ──────────────────────────────────────────────────────────────────
export function Input({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <input
        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white hover:border-slate-400'}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

// ── Textarea ───────────────────────────────────────────────────────────────
export function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-slate-400 transition-colors resize-none" rows={3} {...props} />
    </div>
  )
}

// ── Select ─────────────────────────────────────────────────────────────────
export function Select({ label, children, ...props }: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-slate-400 transition-colors bg-white" {...props}>
        {children}
      </select>
    </div>
  )
}

// ── Btn ────────────────────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', ...props }: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary:   'bg-teal-600 hover:bg-teal-700 text-white shadow-sm',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    success:   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
    ghost:     'hover:bg-slate-100 text-slate-600',
    outline:   'border border-slate-300 hover:bg-slate-50 text-slate-700',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }
  return (
    <button className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${sizes[size]}`} {...props}>
      {children}
    </button>
  )
}

// ── Table ──────────────────────────────────────────────────────────────────
export function Table({ headers, children, className = '' }: { headers: string[]; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {headers.map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}

export function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-slate-700 ${className}`}>{children}</td>
}

// ── SectionHeader ──────────────────────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {action}
    </div>
  )
}

// ── SearchInput ────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input
        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

// ── FilterSelect ───────────────────────────────────────────────────────────
export function FilterSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select
      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-700"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {children}
    </select>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-4">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${active === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ── ProgressBar ────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = 'teal' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const colors: Record<string, string> = { teal: 'bg-teal-500', blue: 'bg-blue-500', green: 'bg-emerald-500', red: 'bg-red-500', amber: 'bg-amber-500' }
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${colors[color] ?? colors.teal}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
