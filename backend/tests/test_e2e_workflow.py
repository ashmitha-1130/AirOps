"""
End-to-end workflow verification for AirOps.
Tests the exact 10-step workflow:
  1. Health check (app is up)
  2. Load synthetic demo data
  3. Verify dashboard statistics against DB counts
  4. Generate schedule v1 using OR-Tools
  5. Verify resource, staff, duration, and availability constraints
  6. Introduce a simulated resource outage (scenario)
  7. Generate revised schedule v2 without overwriting v1
  8. Compare both schedules
  9. Approve or reject the new proposal
 10. Verify the decision in audit history
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db

TEST_DB = "sqlite:///./test_e2e.db"
engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


# ---------------------------------------------------------------------------
# Step 1 – Health check
# ---------------------------------------------------------------------------
def test_step1_health_check():
    """App must respond healthy before any workflow step."""
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    body = r.json()
    assert body["status"] == "ok"
    assert body["service"] == "AirOps API"


# ---------------------------------------------------------------------------
# Step 2 – Load synthetic demo data
# ---------------------------------------------------------------------------
def test_step2_load_demo_data():
    """Demo endpoint must load resources, staff, tasks, and constraints."""
    r = client.post("/api/demo/load")
    assert r.status_code == 200, f"Demo load failed: {r.text}"
    loaded = r.json()["loaded"]
    assert loaded["resources"] == 20, f"Expected 20 resources, got {loaded['resources']}"
    assert loaded["staff"] == 15, f"Expected 15 staff, got {loaded['staff']}"
    assert loaded["tasks"] == 30, f"Expected 30 tasks, got {loaded['tasks']}"
    assert loaded["constraints"] == 3, f"Expected 3 constraints, got {loaded['constraints']}"


# ---------------------------------------------------------------------------
# Step 3 – Verify dashboard statistics against DB
# ---------------------------------------------------------------------------
def test_step3_dashboard_matches_db():
    """Dashboard KPIs must match direct DB queries via the resources/staff/tasks APIs."""
    client.post("/api/demo/load")

    dash = client.get("/api/dashboard").json()

    # Cross-check resources
    all_resources = client.get("/api/resources").json()
    assert dash["resources"]["total"] == len(all_resources), (
        f"Dashboard resources.total={dash['resources']['total']} "
        f"but /api/resources returned {len(all_resources)}"
    )

    avail_resources = client.get("/api/resources?availability_status=available").json()
    assert dash["resources"]["available"] == len(avail_resources), (
        f"Dashboard resources.available={dash['resources']['available']} "
        f"but filtered list has {len(avail_resources)}"
    )

    # Cross-check staff
    all_staff = client.get("/api/staff").json()
    assert dash["staff"]["total"] == len(all_staff), (
        f"Dashboard staff.total={dash['staff']['total']} "
        f"but /api/staff returned {len(all_staff)}"
    )

    # Cross-check tasks
    all_tasks = client.get("/api/tasks").json()
    assert dash["tasks"]["total"] == len(all_tasks), (
        f"Dashboard tasks.total={dash['tasks']['total']} "
        f"but /api/tasks returned {len(all_tasks)}"
    )

    # Seed data has RES-016 under_maintenance
    assert dash["resources"]["under_maintenance"] >= 1, (
        "Expected at least 1 resource under maintenance (RES-016)"
    )

    # STF-014 is unavailable in seed data
    assert dash["staff"]["available"] == len(all_staff) - 1, (
        f"Expected {len(all_staff)-1} available staff (STF-014 is on leave), "
        f"got {dash['staff']['available']}"
    )


# ---------------------------------------------------------------------------
# Step 4 – Generate schedule v1 using OR-Tools
# ---------------------------------------------------------------------------
def test_step4_generate_schedule_v1():
    """OR-Tools must produce a PENDING_REVIEW schedule with assignments."""
    client.post("/api/demo/load")
    r = client.post("/api/schedules/generate", json={"time_limit_seconds": 15})
    assert r.status_code == 201, f"Schedule generation failed: {r.text}"
    s = r.json()
    assert s["status"] == "PENDING_REVIEW"
    assert s["solver_status"] in ("OPTIMAL", "FEASIBLE"), (
        f"Solver returned unexpected status: {s['solver_status']}"
    )
    assert s["total_tasks"] == 30, f"Expected 30 total tasks, got {s['total_tasks']}"
    assert s["scheduled_tasks"] > 0, "No tasks were scheduled"
    assert s["version"] == 1
    assert s["parent_schedule_id"] is None
    assert len(s["assignments"]) == 30, (
        f"Expected 30 assignment rows, got {len(s['assignments'])}"
    )


# ---------------------------------------------------------------------------
# Step 5 – Verify resource, staff, duration, and availability constraints
# ---------------------------------------------------------------------------
def test_step5_constraint_verification():
    """
    Verify that every scheduled assignment satisfies:
      - resource is available + operational
      - staff (if required) is available
      - end_time - start_time == duration_minutes
      - no two assignments on the same resource overlap
      - no two assignments on the same staff member overlap
    Also verify that known-infeasible tasks (TSK-025) are unscheduled.
    """
    client.post("/api/demo/load")
    gen = client.post("/api/schedules/generate", json={"time_limit_seconds": 15}).json()
    sid = gen["schedule_id"]

    schedule = client.get(f"/api/schedules/{sid}").json()
    assignments = schedule["assignments"]

    resources_map = {r["resource_id"]: r for r in client.get("/api/resources").json()}
    staff_map = {s["staff_id"]: s for s in client.get("/api/staff").json()}
    tasks_map = {t["task_id"]: t for t in client.get("/api/tasks").json()}

    scheduled = [a for a in assignments if a["is_scheduled"]]
    unscheduled = [a for a in assignments if not a["is_scheduled"]]

    # 5a – Every scheduled assignment must have resource + start/end times
    for a in scheduled:
        assert a["resource_id"] is not None, f"Task {a['task_id']} scheduled without resource"
        assert a["start_time"] is not None, f"Task {a['task_id']} has no start_time"
        assert a["end_time"] is not None, f"Task {a['task_id']} has no end_time"
        assert a["explanation"] is not None, f"Task {a['task_id']} has no explanation"

    # 5b – Resource must be available and operational
    for a in scheduled:
        res = resources_map.get(a["resource_id"])
        assert res is not None, f"Resource {a['resource_id']} not found in DB"
        assert res["availability_status"] == "available", (
            f"Task {a['task_id']} assigned to unavailable resource {a['resource_id']}"
        )
        assert res["maintenance_status"] == "operational", (
            f"Task {a['task_id']} assigned to resource {a['resource_id']} under maintenance"
        )

    # 5c – Staff (if assigned) must be available
    for a in scheduled:
        if a["staff_id"]:
            s = staff_map.get(a["staff_id"])
            assert s is not None, f"Staff {a['staff_id']} not found in DB"
            assert s["availability_status"] == "available", (
                f"Task {a['task_id']} assigned to unavailable staff {a['staff_id']}"
            )

    # 5d – Duration constraint: end - start == task duration_minutes (within 1 min tolerance)
    from datetime import datetime, timezone
    for a in scheduled:
        task = tasks_map.get(a["task_id"])
        if task is None:
            continue
        st = datetime.fromisoformat(a["start_time"])
        et = datetime.fromisoformat(a["end_time"])
        actual_dur = int((et - st).total_seconds() / 60)
        expected_dur = task["duration_minutes"]
        assert abs(actual_dur - expected_dur) <= 1, (
            f"Task {a['task_id']}: expected duration {expected_dur}min, got {actual_dur}min"
        )

    # 5e – No resource overlap: for each resource, intervals must not overlap
    from collections import defaultdict
    resource_slots: dict = defaultdict(list)
    for a in scheduled:
        st = datetime.fromisoformat(a["start_time"])
        et = datetime.fromisoformat(a["end_time"])
        resource_slots[a["resource_id"]].append((st, et, a["task_id"]))

    for res_id, slots in resource_slots.items():
        slots.sort(key=lambda x: x[0])
        for i in range(len(slots) - 1):
            _, end_i, tid_i = slots[i]
            start_j, _, tid_j = slots[i + 1]
            assert end_i <= start_j, (
                f"Resource {res_id} overlap: task {tid_i} ends {end_i} "
                f"but task {tid_j} starts {start_j}"
            )

    # 5f – No staff overlap
    staff_slots: dict = defaultdict(list)
    for a in scheduled:
        if a["staff_id"]:
            st = datetime.fromisoformat(a["start_time"])
            et = datetime.fromisoformat(a["end_time"])
            staff_slots[a["staff_id"]].append((st, et, a["task_id"]))

    for stf_id, slots in staff_slots.items():
        slots.sort(key=lambda x: x[0])
        for i in range(len(slots) - 1):
            _, end_i, tid_i = slots[i]
            start_j, _, tid_j = slots[i + 1]
            assert end_i <= start_j, (
                f"Staff {stf_id} overlap: task {tid_i} ends {end_i} "
                f"but task {tid_j} starts {start_j}"
            )

    # 5g – TSK-025 (300-min task, 60-min window) must be unscheduled
    tsk025 = next((a for a in unscheduled if a["task_id"] == "TSK-025"), None)
    assert tsk025 is not None, "TSK-025 (infeasible deadline) should be unscheduled"
    assert "deadline" in tsk025["unscheduled_reason"].lower(), (
        f"TSK-025 reason should mention deadline, got: {tsk025['unscheduled_reason']}"
    )

    # 5h – RES-016 (under_maintenance) must not appear in any scheduled assignment
    for a in scheduled:
        assert a["resource_id"] != "RES-016", (
            "RES-016 is under maintenance but was assigned to a task"
        )

    # 5i – STF-014 (unavailable) must not appear in any scheduled assignment
    for a in scheduled:
        assert a["staff_id"] != "STF-014", (
            "STF-014 is unavailable but was assigned to a task"
        )


# ---------------------------------------------------------------------------
# Step 6 – Introduce a simulated resource outage
# ---------------------------------------------------------------------------
def test_step6_resource_outage_scenario():
    """
    Mark RES-001 (Transport Truck Alpha) unavailable via the scenario endpoint.
    Verify the change is reflected in the resource list.
    """
    client.post("/api/demo/load")

    # Confirm RES-001 is available before the outage
    res_before = client.get("/api/resources/RES-001").json()
    assert res_before["availability_status"] == "available", (
        "RES-001 should be available before outage"
    )

    # Trigger outage via scenario (without generating a schedule yet)
    r = client.put("/api/resources/RES-001", json={"availability_status": "unavailable"})
    assert r.status_code == 200, f"Failed to mark RES-001 unavailable: {r.text}"
    assert r.json()["availability_status"] == "unavailable"

    # Confirm the change persisted
    res_after = client.get("/api/resources/RES-001").json()
    assert res_after["availability_status"] == "unavailable", (
        "RES-001 should be unavailable after outage"
    )


# ---------------------------------------------------------------------------
# Step 7 – Generate revised schedule v2 without overwriting v1
# ---------------------------------------------------------------------------
def test_step7_generate_schedule_v2_no_overwrite():
    """
    Generate v1, mark RES-001 unavailable, generate v2 as child of v1.
    Both schedules must coexist in the DB.
    """
    client.post("/api/demo/load")

    # v1
    v1 = client.post("/api/schedules/generate", json={"time_limit_seconds": 15}).json()
    assert v1["version"] == 1

    # Outage
    client.put("/api/resources/RES-001", json={"availability_status": "unavailable"})

    # v2 as child of v1
    v2 = client.post("/api/schedules/generate", json={
        "time_limit_seconds": 15,
        "parent_schedule_id": v1["schedule_id"],
        "scenario_description": "RES-001 Transport Truck Alpha offline – revised schedule",
    }).json()

    assert v2["version"] == 2, f"Expected version 2, got {v2['version']}"
    assert v2["parent_schedule_id"] == v1["schedule_id"], "v2 must reference v1 as parent"
    assert v2["schedule_id"] != v1["schedule_id"], "v1 and v2 must have different IDs"
    assert v2["status"] == "PENDING_REVIEW"

    # Both must still be retrievable
    r1 = client.get(f"/api/schedules/{v1['schedule_id']}")
    r2 = client.get(f"/api/schedules/{v2['schedule_id']}")
    assert r1.status_code == 200, "v1 was overwritten or deleted"
    assert r2.status_code == 200, "v2 not found"

    # v2 must not assign RES-001
    v2_assignments = r2.json()["assignments"]
    for a in v2_assignments:
        if a["is_scheduled"]:
            assert a["resource_id"] != "RES-001", (
                "v2 assigned RES-001 which is marked unavailable"
            )

    # v1 must still have its original assignments intact
    v1_scheduled = [a for a in r1.json()["assignments"] if a["is_scheduled"]]
    assert len(v1_scheduled) > 0, "v1 assignments were wiped"


# ---------------------------------------------------------------------------
# Step 8 – Compare both schedules
# ---------------------------------------------------------------------------
def test_step8_compare_schedules():
    """
    Compare v1 and v2: verify delta fields (scheduled_tasks, unscheduled_tasks,
    objective_score, version, parent linkage).
    """
    client.post("/api/demo/load")

    v1 = client.post("/api/schedules/generate", json={"time_limit_seconds": 15}).json()
    client.put("/api/resources/RES-001", json={"availability_status": "unavailable"})
    v2 = client.post("/api/schedules/generate", json={
        "time_limit_seconds": 15,
        "parent_schedule_id": v1["schedule_id"],
        "scenario_description": "RES-001 offline",
    }).json()

    # Fetch full details
    s1 = client.get(f"/api/schedules/{v1['schedule_id']}").json()
    s2 = client.get(f"/api/schedules/{v2['schedule_id']}").json()

    # Version chain
    assert s2["version"] == s1["version"] + 1
    assert s2["parent_schedule_id"] == s1["schedule_id"]

    # Both have the same total_tasks (same 30 tasks in DB)
    assert s1["total_tasks"] == s2["total_tasks"] == 30

    # With one fewer transport vehicle, v2 should schedule <= v1 transport tasks
    # (we can't assert strict inequality because other resources may compensate,
    #  but we can assert v2 is a valid schedule)
    assert s2["scheduled_tasks"] >= 0
    assert s2["unscheduled_tasks"] >= 0
    assert s2["scheduled_tasks"] + s2["unscheduled_tasks"] == 30

    # Delta summary
    delta_scheduled = s2["scheduled_tasks"] - s1["scheduled_tasks"]
    delta_unscheduled = s2["unscheduled_tasks"] - s1["unscheduled_tasks"]
    assert delta_scheduled + delta_unscheduled == 0, (
        "Delta scheduled + delta unscheduled must sum to zero"
    )

    # Objective score: v2 should be <= v1 (fewer resources = same or worse)
    if s1["objective_score"] is not None and s2["objective_score"] is not None:
        assert s2["objective_score"] <= s1["objective_score"] + 0.01, (
            f"v2 objective {s2['objective_score']} unexpectedly higher than "
            f"v1 {s1['objective_score']} after removing a resource"
        )

    # List endpoint must return both
    all_schedules = client.get("/api/schedules").json()
    ids = [s["schedule_id"] for s in all_schedules]
    assert v1["schedule_id"] in ids, "v1 missing from schedule list"
    assert v2["schedule_id"] in ids, "v2 missing from schedule list"


# ---------------------------------------------------------------------------
# Step 9 – Approve or reject the new proposal
# ---------------------------------------------------------------------------
def test_step9_approve_v2():
    """Approve v2; verify status transitions and idempotency guard."""
    client.post("/api/demo/load")
    v1 = client.post("/api/schedules/generate", json={"time_limit_seconds": 10}).json()
    client.put("/api/resources/RES-001", json={"availability_status": "unavailable"})
    v2 = client.post("/api/schedules/generate", json={
        "time_limit_seconds": 10,
        "parent_schedule_id": v1["schedule_id"],
        "scenario_description": "RES-001 offline",
    }).json()

    # Approve v2
    r = client.post(f"/api/schedules/{v2['schedule_id']}/approve",
                    json={"reviewer_id": "OPS-OFFICER-001"})
    assert r.status_code == 200, f"Approve failed: {r.text}"
    approved = r.json()
    assert approved["status"] == "APPROVED"
    assert approved["reviewer_id"] == "OPS-OFFICER-001"
    assert approved["reviewed_at"] is not None

    # Double-approve must fail with 400
    r2 = client.post(f"/api/schedules/{v2['schedule_id']}/approve",
                     json={"reviewer_id": "OPS-OFFICER-001"})
    assert r2.status_code == 400, "Second approve should return 400"

    # v1 must remain PENDING_REVIEW (approval of v2 doesn't touch v1)
    v1_status = client.get(f"/api/schedules/{v1['schedule_id']}").json()["status"]
    assert v1_status == "PENDING_REVIEW", (
        f"v1 status should still be PENDING_REVIEW, got {v1_status}"
    )


def test_step9_reject_v2():
    """Reject v2 with a reason; verify status and reason stored."""
    client.post("/api/demo/load")
    v1 = client.post("/api/schedules/generate", json={"time_limit_seconds": 10}).json()
    client.put("/api/resources/RES-001", json={"availability_status": "unavailable"})
    v2 = client.post("/api/schedules/generate", json={
        "time_limit_seconds": 10,
        "parent_schedule_id": v1["schedule_id"],
        "scenario_description": "RES-001 offline",
    }).json()

    r = client.post(f"/api/schedules/{v2['schedule_id']}/reject", json={
        "reviewer_id": "OPS-OFFICER-002",
        "reason": "Insufficient coverage for priority-1 transport tasks",
    })
    assert r.status_code == 200, f"Reject failed: {r.text}"
    rejected = r.json()
    assert rejected["status"] == "REJECTED"
    assert rejected["reviewer_id"] == "OPS-OFFICER-002"
    assert "Insufficient coverage" in rejected["review_notes"]

    # Double-reject must fail
    r2 = client.post(f"/api/schedules/{v2['schedule_id']}/reject", json={
        "reviewer_id": "OPS-OFFICER-002",
        "reason": "Again",
    })
    assert r2.status_code == 400


# ---------------------------------------------------------------------------
# Step 10 – Verify the decision in audit history
# ---------------------------------------------------------------------------
def test_step10_audit_history_approve():
    """After approving v2, audit log must contain SCHEDULE_APPROVED event."""
    client.post("/api/demo/load")
    v1 = client.post("/api/schedules/generate", json={"time_limit_seconds": 10}).json()
    client.put("/api/resources/RES-001", json={"availability_status": "unavailable"})
    v2 = client.post("/api/schedules/generate", json={
        "time_limit_seconds": 10,
        "parent_schedule_id": v1["schedule_id"],
        "scenario_description": "RES-001 offline",
    }).json()
    client.post(f"/api/schedules/{v2['schedule_id']}/approve",
                json={"reviewer_id": "AUDITOR-001"})

    audit = client.get("/api/audit").json()
    event_types = [e["event_type"] for e in audit]

    assert "SCHEDULE_GENERATED" in event_types, "Missing SCHEDULE_GENERATED audit event"
    assert "SCHEDULE_APPROVED" in event_types, "Missing SCHEDULE_APPROVED audit event"
    assert "RESOURCE_UPDATED" in event_types, "Missing RESOURCE_UPDATED audit event"
    assert "SEED_DATA_LOADED" in event_types, "Missing SEED_DATA_LOADED audit event"

    # Find the specific approval event for v2
    approval_events = [
        e for e in audit
        if e["event_type"] == "SCHEDULE_APPROVED" and e["entity_id"] == v2["schedule_id"]
    ]
    assert len(approval_events) == 1, (
        f"Expected exactly 1 SCHEDULE_APPROVED event for {v2['schedule_id']}, "
        f"found {len(approval_events)}"
    )
    ev = approval_events[0]
    assert ev["actor"] == "AUDITOR-001"
    assert v2["schedule_id"] in ev["description"]


def test_step10_audit_history_reject():
    """After rejecting v2, audit log must contain SCHEDULE_REJECTED event."""
    client.post("/api/demo/load")
    v1 = client.post("/api/schedules/generate", json={"time_limit_seconds": 10}).json()
    client.put("/api/resources/RES-001", json={"availability_status": "unavailable"})
    v2 = client.post("/api/schedules/generate", json={
        "time_limit_seconds": 10,
        "parent_schedule_id": v1["schedule_id"],
        "scenario_description": "RES-001 offline",
    }).json()
    client.post(f"/api/schedules/{v2['schedule_id']}/reject", json={
        "reviewer_id": "AUDITOR-002",
        "reason": "Needs rework",
    })

    audit = client.get("/api/audit").json()
    rejection_events = [
        e for e in audit
        if e["event_type"] == "SCHEDULE_REJECTED" and e["entity_id"] == v2["schedule_id"]
    ]
    assert len(rejection_events) == 1, (
        f"Expected 1 SCHEDULE_REJECTED event for {v2['schedule_id']}, "
        f"found {len(rejection_events)}"
    )
    ev = rejection_events[0]
    assert ev["actor"] == "AUDITOR-002"
    assert "Needs rework" in ev["description"]


# ---------------------------------------------------------------------------
# Full workflow in one shot (integration smoke test)
# ---------------------------------------------------------------------------
def test_full_e2e_workflow():
    """
    Runs all 10 steps sequentially in a single test to verify the complete
    workflow chain with shared state.
    """
    # Step 1
    assert client.get("/api/health").json()["status"] == "ok"

    # Step 2
    loaded = client.post("/api/demo/load").json()["loaded"]
    assert loaded["resources"] == 20
    assert loaded["tasks"] == 30

    # Step 3
    dash = client.get("/api/dashboard").json()
    assert dash["resources"]["total"] == 20
    assert dash["tasks"]["total"] == 30
    assert dash["staff"]["total"] == 15

    # Step 4 – v1
    v1 = client.post("/api/schedules/generate", json={"time_limit_seconds": 15}).json()
    assert v1["status"] == "PENDING_REVIEW"
    assert v1["scheduled_tasks"] > 0
    assert v1["version"] == 1

    # Step 5 – constraint check on v1
    s1 = client.get(f"/api/schedules/{v1['schedule_id']}").json()
    resources_map = {r["resource_id"]: r for r in client.get("/api/resources").json()}
    for a in s1["assignments"]:
        if a["is_scheduled"]:
            res = resources_map[a["resource_id"]]
            assert res["availability_status"] == "available"
            assert res["maintenance_status"] == "operational"
            assert a["resource_id"] != "RES-016"  # under maintenance

    # Step 6 – outage
    client.put("/api/resources/RES-001", json={"availability_status": "unavailable"})
    assert client.get("/api/resources/RES-001").json()["availability_status"] == "unavailable"

    # Step 7 – v2
    v2 = client.post("/api/schedules/generate", json={
        "time_limit_seconds": 15,
        "parent_schedule_id": v1["schedule_id"],
        "scenario_description": "RES-001 offline",
    }).json()
    assert v2["version"] == 2
    assert v2["parent_schedule_id"] == v1["schedule_id"]
    # v1 still exists
    assert client.get(f"/api/schedules/{v1['schedule_id']}").status_code == 200

    # Step 8 – compare
    s2 = client.get(f"/api/schedules/{v2['schedule_id']}").json()
    assert s1["total_tasks"] == s2["total_tasks"]
    for a in s2["assignments"]:
        if a["is_scheduled"]:
            assert a["resource_id"] != "RES-001"

    # Step 9 – approve v2
    approved = client.post(
        f"/api/schedules/{v2['schedule_id']}/approve",
        json={"reviewer_id": "OPS-CHIEF"}
    ).json()
    assert approved["status"] == "APPROVED"

    # Step 10 – audit
    audit = client.get("/api/audit").json()
    event_types = {e["event_type"] for e in audit}
    assert "SCHEDULE_GENERATED" in event_types
    assert "SCHEDULE_APPROVED" in event_types
    approval = next(
        e for e in audit
        if e["event_type"] == "SCHEDULE_APPROVED" and e["entity_id"] == v2["schedule_id"]
    )
    assert approval["actor"] == "OPS-CHIEF"
