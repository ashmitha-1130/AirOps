import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Server, Users, ClipboardList, Upload,
  Calendar, FlaskConical, CheckSquare, History, Settings,
  Zap, GitCompare
} from 'lucide-react'

const nav = [
  { to: '/',          label: 'Overview',          icon: LayoutDashboard, group: 'main' },
  { to: '/resources', label: 'Resources',          icon: Server,          group: 'data' },
  { to: '/staff',     label: 'Staff',              icon: Users,           group: 'data' },
  { to: '/tasks',     label: 'Tasks',              icon: ClipboardList,   group: 'data' },
  { to: '/import',    label: 'Data Import',        icon: Upload,          group: 'data' },
  { to: '/schedule',  label: 'Schedule Planner',   icon: Calendar,        group: 'ops' },
  { to: '/scenario',  label: 'Scenario Simulator', icon: FlaskConical,    group: 'ops' },
  { to: '/compare',   label: 'Schedule Compare',   icon: GitCompare,      group: 'ops' },
  { to: '/review',    label: 'Schedule Review',    icon: CheckSquare,     group: 'ops' },
  { to: '/audit',     label: 'Audit History',      icon: History,         group: 'system' },
  { to: '/settings',  label: 'Settings',           icon: Settings,        group: 'system' },
]

const groups = [
  { key: 'main',   label: null },
  { key: 'data',   label: 'Data Management' },
  { key: 'ops',    label: 'Operations' },
  { key: 'system', label: 'System' },
]

const PAGE_TITLES: Record<string, string> = {
  '/': 'Operations Overview',
  '/resources': 'Resource Management',
  '/staff': 'Staff Management',
  '/tasks': 'Task Management',
  '/import': 'Data Import',
  '/schedule': 'Schedule Planner',
  '/scenario': 'Scenario Simulator',
  '/compare': 'Schedule Comparison',
  '/review': 'Schedule Review',
  '/audit': 'Audit History',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'AirOps'

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0f172a] flex flex-col shrink-0 border-r border-slate-800">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight tracking-wide">AirOps</div>
            <div className="text-slate-500 text-xs">Resource Planning</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {groups.map(({ key, label }) => {
            const items = nav.filter(n => n.group === key)
            return (
              <div key={key} className="mb-1">
                {label && (
                  <div className="px-4 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{label}</div>
                )}
                {items.map(({ to, label: lbl, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-teal-600/20 text-teal-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon size={15} />
                    <span>{lbl}</span>
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500">SIH 2026 · Problem 26250</span>
          </div>
          <div className="text-xs text-slate-700 mt-0.5">MoD · DSSC</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0">
          <h1 className="text-sm font-semibold text-slate-800">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400">Air Operations Resource Planning & Optimisation</span>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-xs text-slate-500">Backend Connected</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
