import pytest
from datetime import datetime, timezone, timedelta
from app.scheduling.engine import (
    run_scheduler, ScheduleTask, ScheduleResource, ScheduleStaff
)

BASE = datetime(2026, 7, 14, 6, 0, 0, tzinfo=timezone.utc)

def make_task(tid, dur, priority=3, offset_start=0, offset_end=8, rtype="transport_vehicle", skill=None):
    return ScheduleTask(
        task_id=tid, duration_minutes=dur, priority=priority,
        earliest_start=BASE + timedelta(hours=offset_start),
        deadline=BASE + timedelta(hours=offset_end),
        required_resource_type=rtype, required_skill=skill,
    )

def make_resource(rid, rtype="transport_vehicle", avail="available", maint="operational"):
    return ScheduleResource(resource_id=rid, resource_type=rtype, availability_status=avail, maintenance_status=maint)

def make_staff(sid, skill="driving", avail="available"):
    return ScheduleStaff(staff_id=sid, skill_category=skill, availability_status=avail)


def test_empty_tasks():
    result = run_scheduler([], [], [])
    assert result.status == "FEASIBLE"
    assert result.total_tasks == 0


def test_single_task_scheduled():
    tasks = [make_task("T1", 60)]
    resources = [make_resource("R1")]
    result = run_scheduler(tasks, resources, [])
    assert result.scheduled_tasks == 1
    a = result.assignments[0]
    assert a.is_scheduled
    assert a.resource_id == "R1"


def test_resource_unavailable():
    tasks = [make_task("T1", 60)]
    resources = [make_resource("R1", avail="unavailable")]
    result = run_scheduler(tasks, resources, [])
    assert result.scheduled_tasks == 0
    assert not result.assignments[0].is_scheduled


def test_resource_under_maintenance():
    tasks = [make_task("T1", 60)]
    resources = [make_resource("R1", maint="under_maintenance")]
    result = run_scheduler(tasks, resources, [])
    assert result.scheduled_tasks == 0


def test_no_resource_of_required_type():
    tasks = [make_task("T1", 60, rtype="training_facility")]
    resources = [make_resource("R1", rtype="transport_vehicle")]
    result = run_scheduler(tasks, resources, [])
    assert result.scheduled_tasks == 0
    assert "No available resource" in result.assignments[0].unscheduled_reason


def test_staff_required_and_available():
    tasks = [make_task("T1", 60, skill="driving")]
    resources = [make_resource("R1")]
    staff = [make_staff("S1", skill="driving")]
    result = run_scheduler(tasks, resources, staff)
    assert result.scheduled_tasks == 1
    assert result.assignments[0].staff_id == "S1"


def test_staff_unavailable():
    tasks = [make_task("T1", 60, skill="driving")]
    resources = [make_resource("R1")]
    staff = [make_staff("S1", skill="driving", avail="unavailable")]
    result = run_scheduler(tasks, resources, staff)
    assert result.scheduled_tasks == 0
    assert "No available staff" in result.assignments[0].unscheduled_reason


def test_no_staff_with_required_skill():
    tasks = [make_task("T1", 60, skill="piloting")]
    resources = [make_resource("R1")]
    staff = [make_staff("S1", skill="driving")]
    result = run_scheduler(tasks, resources, staff)
    assert result.scheduled_tasks == 0


def test_deadline_too_tight():
    # 300 min task with 60 min window
    tasks = [make_task("T1", 300, offset_start=0, offset_end=1)]
    resources = [make_resource("R1")]
    result = run_scheduler(tasks, resources, [])
    assert result.scheduled_tasks == 0
    assert "deadline" in result.assignments[0].unscheduled_reason.lower()


def test_no_overlap_same_resource():
    # Two tasks that together exceed the window if on same resource
    tasks = [
        make_task("T1", 120, offset_start=0, offset_end=4),
        make_task("T2", 120, offset_start=0, offset_end=4),
    ]
    resources = [make_resource("R1")]  # Only one resource
    result = run_scheduler(tasks, resources, [])
    # At most one can be scheduled on R1 in a 4-hour window
    assert result.scheduled_tasks <= 2
    # Verify no overlap
    scheduled = [a for a in result.assignments if a.is_scheduled]
    if len(scheduled) == 2:
        a1, a2 = scheduled
        assert a1.end_time <= a2.start_time or a2.end_time <= a1.start_time


def test_no_overlap_same_staff():
    tasks = [
        make_task("T1", 120, skill="driving", offset_start=0, offset_end=4),
        make_task("T2", 120, skill="driving", offset_start=0, offset_end=4),
    ]
    resources = [make_resource("R1"), make_resource("R2")]
    staff = [make_staff("S1", skill="driving")]  # Only one staff
    result = run_scheduler(tasks, resources, staff)
    scheduled = [a for a in result.assignments if a.is_scheduled]
    if len(scheduled) == 2:
        a1, a2 = scheduled
        assert a1.end_time <= a2.start_time or a2.end_time <= a1.start_time


def test_priority_scheduling():
    # High priority task should be scheduled over low priority when resource is scarce
    tasks = [
        make_task("T_HIGH", 180, priority=1, offset_start=0, offset_end=4),
        make_task("T_LOW", 180, priority=5, offset_start=0, offset_end=4),
    ]
    resources = [make_resource("R1")]
    result = run_scheduler(tasks, resources, [])
    scheduled = [a for a in result.assignments if a.is_scheduled]
    assert len(scheduled) >= 1
    if len(scheduled) == 1:
        assert scheduled[0].task_id == "T_HIGH"


def test_multiple_resources_allow_parallel():
    tasks = [
        make_task("T1", 120, offset_start=0, offset_end=4),
        make_task("T2", 120, offset_start=0, offset_end=4),
    ]
    resources = [make_resource("R1"), make_resource("R2")]
    result = run_scheduler(tasks, resources, [])
    assert result.scheduled_tasks == 2


def test_schedule_result_fields():
    tasks = [make_task("T1", 60)]
    resources = [make_resource("R1")]
    result = run_scheduler(tasks, resources, [])
    assert result.runtime_seconds >= 0
    assert result.total_tasks == 1
    assert len(result.assignments) == 1
    a = result.assignments[0]
    assert a.task_id == "T1"
    if a.is_scheduled:
        assert a.start_time is not None
        assert a.end_time is not None
        assert a.explanation is not None
