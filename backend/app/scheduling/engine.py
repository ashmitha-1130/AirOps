"""
OR-Tools CP-SAT based scheduling engine for AirOps.
Schedules non-combat logistics, training, maintenance, and transport tasks.
"""
from __future__ import annotations
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from ortools.sat.python import cp_model


@dataclass
class ScheduleTask:
    task_id: str
    duration_minutes: int
    priority: int
    earliest_start: datetime
    deadline: datetime
    required_resource_type: str
    required_skill: Optional[str] = None


@dataclass
class ScheduleResource:
    resource_id: str
    resource_type: str
    availability_status: str
    maintenance_status: str
    unavailable_windows: list[tuple[datetime, datetime]] = field(default_factory=list)


@dataclass
class ScheduleStaff:
    staff_id: str
    skill_category: str
    availability_status: str
    unavailable_windows: list[tuple[datetime, datetime]] = field(default_factory=list)


@dataclass
class AssignmentResult:
    task_id: str
    is_scheduled: bool
    resource_id: Optional[str] = None
    staff_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    unscheduled_reason: Optional[str] = None
    explanation: Optional[str] = None


@dataclass
class ScheduleResult:
    status: str  # FEASIBLE, OPTIMAL, INFEASIBLE, UNKNOWN
    objective_score: Optional[float]
    runtime_seconds: float
    assignments: list[AssignmentResult]
    total_tasks: int
    scheduled_tasks: int
    unscheduled_tasks: int


def _to_minutes(dt: datetime, epoch: datetime) -> int:
    delta = dt - epoch
    return max(0, int(delta.total_seconds() / 60))


def run_scheduler(
    tasks: list[ScheduleTask],
    resources: list[ScheduleResource],
    staff: list[ScheduleStaff],
    time_limit_seconds: int = 30,
) -> ScheduleResult:
    start_wall = time.time()

    if not tasks:
        return ScheduleResult("FEASIBLE", 0.0, 0.0, [], 0, 0, 0)

    # Epoch: earliest task start
    epoch = min(t.earliest_start for t in tasks)
    epoch = epoch.replace(tzinfo=timezone.utc) if epoch.tzinfo is None else epoch

    # Pre-filter available resources and staff
    avail_resources = [
        r for r in resources
        if r.availability_status == "available" and r.maintenance_status == "operational"
    ]
    avail_staff = [s for s in staff if s.availability_status == "available"]

    # Build resource type map
    resource_by_type: dict[str, list[ScheduleResource]] = {}
    for r in avail_resources:
        resource_by_type.setdefault(r.resource_type, []).append(r)

    # Build skill map
    staff_by_skill: dict[str, list[ScheduleStaff]] = {}
    for s in avail_staff:
        staff_by_skill.setdefault(s.skill_category, []).append(s)

    # Determine horizon in minutes
    if tasks:
        horizon = max(_to_minutes(t.deadline, epoch) for t in tasks) + 1
    else:
        horizon = 1440

    model = cp_model.CpModel()

    # Variables
    task_vars: dict[str, dict] = {}
    for t in tasks:
        es = _to_minutes(t.earliest_start, epoch)
        dl = _to_minutes(t.deadline, epoch)
        dur = t.duration_minutes

        if dl - es < dur:
            # Infeasible by time window alone
            task_vars[t.task_id] = {"infeasible_reason": "deadline_too_tight"}
            continue

        start_var = model.new_int_var(es, max(es, dl - dur), f"start_{t.task_id}")
        end_var = model.new_int_var(es + dur, dl, f"end_{t.task_id}")
        interval_var = model.new_interval_var(start_var, dur, end_var, f"interval_{t.task_id}")
        is_scheduled = model.new_bool_var(f"sched_{t.task_id}")

        task_vars[t.task_id] = {
            "start": start_var,
            "end": end_var,
            "interval": interval_var,
            "is_scheduled": is_scheduled,
            "duration": dur,
            "priority": t.priority,
        }

    # Resource assignment variables
    # For each task, for each candidate resource: bool var
    task_resource_vars: dict[str, dict[str, object]] = {}
    task_staff_vars: dict[str, dict[str, object]] = {}

    for t in tasks:
        if t.task_id not in task_vars or "infeasible_reason" in task_vars[t.task_id]:
            continue
        tv = task_vars[t.task_id]
        candidates = resource_by_type.get(t.required_resource_type, [])

        if not candidates:
            # No resource of required type
            model.add(tv["is_scheduled"] == 0)
            tv["no_resource"] = True
            continue

        res_vars = {}
        for r in candidates:
            rv = model.new_bool_var(f"res_{t.task_id}_{r.resource_id}")
            res_vars[r.resource_id] = rv
        task_resource_vars[t.task_id] = res_vars

        # Exactly one resource if scheduled, zero if not
        model.add(sum(res_vars.values()) == tv["is_scheduled"])

        # Staff assignment
        if t.required_skill:
            skill_candidates = staff_by_skill.get(t.required_skill, [])
            if not skill_candidates:
                model.add(tv["is_scheduled"] == 0)
                tv["no_staff"] = True
                continue
            st_vars = {}
            for s in skill_candidates:
                sv = model.new_bool_var(f"staff_{t.task_id}_{s.staff_id}")
                st_vars[s.staff_id] = sv
            task_staff_vars[t.task_id] = st_vars
            model.add(sum(st_vars.values()) == tv["is_scheduled"])

    # No-overlap per resource using optional intervals
    resource_intervals: dict[str, list] = {}
    for t in tasks:
        if t.task_id not in task_vars or "infeasible_reason" in task_vars[t.task_id]:
            continue
        if t.task_id not in task_resource_vars:
            continue
        tv = task_vars[t.task_id]
        for r_id, rv in task_resource_vars[t.task_id].items():
            opt_interval = model.new_optional_interval_var(
                tv["start"], tv["duration"], tv["end"], rv, f"opt_res_{t.task_id}_{r_id}"
            )
            resource_intervals.setdefault(r_id, []).append(opt_interval)

    for r_id, intervals in resource_intervals.items():
        if len(intervals) > 1:
            model.add_no_overlap(intervals)

    # No-overlap per staff
    staff_intervals: dict[str, list] = {}
    for t in tasks:
        if t.task_id not in task_vars or "infeasible_reason" in task_vars[t.task_id]:
            continue
        if t.task_id not in task_staff_vars:
            continue
        tv = task_vars[t.task_id]
        for s_id, sv in task_staff_vars[t.task_id].items():
            opt_interval = model.new_optional_interval_var(
                tv["start"], tv["duration"], tv["end"], sv, f"opt_staff_{t.task_id}_{s_id}"
            )
            staff_intervals.setdefault(s_id, []).append(opt_interval)

    for s_id, intervals in staff_intervals.items():
        if len(intervals) > 1:
            model.add_no_overlap(intervals)

    # Objective: maximise weighted scheduled tasks (higher priority = higher weight)
    # Priority 1=highest, 5=lowest; weight = 6 - priority
    obj_terms = []
    for t in tasks:
        if t.task_id not in task_vars or "infeasible_reason" in task_vars[t.task_id]:
            continue
        tv = task_vars[t.task_id]
        weight = max(1, 6 - tv["priority"])
        obj_terms.append(weight * tv["is_scheduled"])

    if obj_terms:
        model.maximize(sum(obj_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = 1

    solve_status = solver.solve(model)
    runtime = time.time() - start_wall

    status_map = {
        cp_model.OPTIMAL: "OPTIMAL",
        cp_model.FEASIBLE: "FEASIBLE",
        cp_model.INFEASIBLE: "INFEASIBLE",
        cp_model.UNKNOWN: "UNKNOWN",
    }
    status_str = status_map.get(solve_status, "UNKNOWN")

    assignments: list[AssignmentResult] = []

    for t in tasks:
        tv = task_vars.get(t.task_id, {})

        if "infeasible_reason" in tv:
            reason = "Task deadline is too tight for its duration"
            assignments.append(AssignmentResult(
                task_id=t.task_id, is_scheduled=False,
                unscheduled_reason=reason,
                explanation=f"Hard constraint violation: {reason}. Duration {t.duration_minutes}min exceeds available window."
            ))
            continue

        if "no_resource" in tv:
            assignments.append(AssignmentResult(
                task_id=t.task_id, is_scheduled=False,
                unscheduled_reason=f"No available resource of type '{t.required_resource_type}'",
                explanation=f"No resource matching type '{t.required_resource_type}' is currently available or operational."
            ))
            continue

        if "no_staff" in tv:
            assignments.append(AssignmentResult(
                task_id=t.task_id, is_scheduled=False,
                unscheduled_reason=f"No available staff with skill '{t.required_skill}'",
                explanation=f"No staff member with skill category '{t.required_skill}' is currently available."
            ))
            continue

        if status_str in ("INFEASIBLE", "UNKNOWN") or t.task_id not in task_vars:
            assignments.append(AssignmentResult(
                task_id=t.task_id, is_scheduled=False,
                unscheduled_reason="Solver could not find a feasible schedule",
                explanation="The solver returned INFEASIBLE or UNKNOWN status for this scheduling run."
            ))
            continue

        is_sched = bool(solver.value(tv["is_scheduled"]))

        if not is_sched:
            # Determine reason
            candidates = resource_by_type.get(t.required_resource_type, [])
            if not candidates:
                reason = f"No resource of type '{t.required_resource_type}' available"
            else:
                reason = "Resource or staff conflict prevented scheduling within the time window"
            assignments.append(AssignmentResult(
                task_id=t.task_id, is_scheduled=False,
                unscheduled_reason=reason,
                explanation=f"Soft constraint: task could not be scheduled due to resource/staff conflicts. {reason}."
            ))
            continue

        start_min = solver.value(tv["start"])
        end_min = start_min + tv["duration"]

        from datetime import timedelta
        start_dt = epoch + timedelta(minutes=start_min)
        end_dt = epoch + timedelta(minutes=end_min)

        assigned_resource = None
        if t.task_id in task_resource_vars:
            for r_id, rv in task_resource_vars[t.task_id].items():
                if solver.value(rv):
                    assigned_resource = r_id
                    break

        assigned_staff = None
        if t.task_id in task_staff_vars:
            for s_id, sv in task_staff_vars[t.task_id].items():
                if solver.value(sv):
                    assigned_staff = s_id
                    break

        explanation_parts = [
            f"Scheduled from {start_dt.strftime('%Y-%m-%d %H:%M')} to {end_dt.strftime('%Y-%m-%d %H:%M')} UTC.",
            f"Resource '{assigned_resource}' is available and operational.",
        ]
        if assigned_staff:
            explanation_parts.append(f"Staff '{assigned_staff}' has required skill '{t.required_skill}' and is available.")
        explanation_parts.append(f"No overlapping assignments detected for resource or staff.")
        explanation_parts.append(f"Task fits within earliest start and deadline window.")

        assignments.append(AssignmentResult(
            task_id=t.task_id,
            is_scheduled=True,
            resource_id=assigned_resource,
            staff_id=assigned_staff,
            start_time=start_dt,
            end_time=end_dt,
            explanation=" ".join(explanation_parts),
        ))

    scheduled = sum(1 for a in assignments if a.is_scheduled)
    obj = float(solver.objective_value) if status_str in ("OPTIMAL", "FEASIBLE") else None

    return ScheduleResult(
        status=status_str,
        objective_score=obj,
        runtime_seconds=runtime,
        assignments=assignments,
        total_tasks=len(tasks),
        scheduled_tasks=scheduled,
        unscheduled_tasks=len(tasks) - scheduled,
    )
