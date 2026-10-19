import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

const api = axios.create({ baseURL: BASE_URL })
export default api

export interface Resource {
  id: number; resource_id: string; name: string; resource_type: string;
  capacity: number; availability_status: string; maintenance_status: string;
  availability_notes?: string; is_active: boolean; created_at: string; updated_at: string;
}
export interface Staff {
  id: number; staff_id: string; name: string; role: string; skill_category: string;
  availability_status: string; availability_notes?: string; is_active: boolean;
  created_at: string; updated_at: string;
}
export interface Task {
  id: number; task_id: string; title: string; category: string; description?: string;
  duration_minutes: number; priority: number; earliest_start: string; deadline: string;
  required_resource_type: string; required_skill?: string; scheduling_status: string;
  is_active: boolean; created_at: string; updated_at: string;
}
export interface Assignment {
  id: number; task_id: string; resource_id?: string; staff_id?: string;
  start_time?: string; end_time?: string; is_scheduled: boolean;
  unscheduled_reason?: string; explanation?: string;
}
export interface ScheduleRun {
  id: number; schedule_id: string; version: number; status: string; solver_status: string;
  objective_score?: number; runtime_seconds?: number; total_tasks: number;
  scheduled_tasks: number; unscheduled_tasks: number; scenario_description?: string;
  parent_schedule_id?: string; reviewer_id?: string; review_notes?: string;
  reviewed_at?: string; created_at: string; updated_at: string; assignments: Assignment[];
}
export interface AuditLog {
  id: number; event_type: string; entity_type: string; entity_id: string;
  actor: string; description: string; metadata_json?: string; created_at: string;
}
export interface Constraint {
  id: number; constraint_id: string; constraint_type: string; entity_type: string;
  entity_id: string; start_time: string; end_time: string; reason?: string;
  is_active: boolean; created_at: string; updated_at: string;
}
