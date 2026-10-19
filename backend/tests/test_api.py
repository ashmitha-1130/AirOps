import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db

TEST_DB = "sqlite:///./test_airops.db"
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


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_load_demo_data():
    r = client.post("/api/demo/load")
    assert r.status_code == 200
    data = r.json()
    assert data["loaded"]["resources"] > 0
    assert data["loaded"]["tasks"] > 0


def test_list_resources_empty():
    r = client.get("/api/resources")
    assert r.status_code == 200
    assert r.json() == []


def test_create_resource():
    r = client.post("/api/resources", json={
        "resource_id": "R-TEST-001",
        "name": "Test Vehicle",
        "resource_type": "transport_vehicle",
        "capacity": 5,
        "availability_status": "available",
        "maintenance_status": "operational",
    })
    assert r.status_code == 201
    assert r.json()["resource_id"] == "R-TEST-001"


def test_create_duplicate_resource():
    client.post("/api/resources", json={
        "resource_id": "R-DUP", "name": "Dup", "resource_type": "transport_vehicle",
        "capacity": 1, "availability_status": "available", "maintenance_status": "operational",
    })
    r = client.post("/api/resources", json={
        "resource_id": "R-DUP", "name": "Dup2", "resource_type": "transport_vehicle",
        "capacity": 1, "availability_status": "available", "maintenance_status": "operational",
    })
    assert r.status_code == 400


def test_create_staff():
    r = client.post("/api/staff", json={
        "staff_id": "S-TEST-001", "name": "Test Person",
        "role": "Driver", "skill_category": "driving",
        "availability_status": "available",
    })
    assert r.status_code == 201


def test_create_task():
    r = client.post("/api/tasks", json={
        "task_id": "T-TEST-001", "title": "Test Task",
        "category": "training", "duration_minutes": 60,
        "priority": 2,
        "earliest_start": "2026-07-14T06:00:00+00:00",
        "deadline": "2026-07-14T14:00:00+00:00",
        "required_resource_type": "training_facility",
    })
    assert r.status_code == 201


def test_generate_schedule_empty():
    r = client.post("/api/schedules/generate", json={"time_limit_seconds": 5})
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "PENDING_REVIEW"
    assert data["total_tasks"] == 0


def test_generate_schedule_with_data():
    client.post("/api/demo/load")
    r = client.post("/api/schedules/generate", json={"time_limit_seconds": 10})
    assert r.status_code == 201
    data = r.json()
    assert data["total_tasks"] > 0
    assert data["status"] == "PENDING_REVIEW"


def test_approve_schedule():
    client.post("/api/demo/load")
    gen = client.post("/api/schedules/generate", json={"time_limit_seconds": 5})
    sid = gen.json()["schedule_id"]
    r = client.post(f"/api/schedules/{sid}/approve", json={"reviewer_id": "REVIEWER-001"})
    assert r.status_code == 200
    assert r.json()["status"] == "APPROVED"


def test_reject_schedule():
    client.post("/api/demo/load")
    gen = client.post("/api/schedules/generate", json={"time_limit_seconds": 5})
    sid = gen.json()["schedule_id"]
    r = client.post(f"/api/schedules/{sid}/reject", json={"reviewer_id": "REVIEWER-001", "reason": "Needs revision"})
    assert r.status_code == 200
    assert r.json()["status"] == "REJECTED"


def test_double_approve_fails():
    client.post("/api/demo/load")
    gen = client.post("/api/schedules/generate", json={"time_limit_seconds": 5})
    sid = gen.json()["schedule_id"]
    client.post(f"/api/schedules/{sid}/approve", json={"reviewer_id": "R1"})
    r = client.post(f"/api/schedules/{sid}/approve", json={"reviewer_id": "R1"})
    assert r.status_code == 400


def test_audit_log_created():
    client.post("/api/demo/load")
    r = client.get("/api/audit")
    assert r.status_code == 200
    assert len(r.json()) > 0


def test_schedule_versioning():
    client.post("/api/demo/load")
    s1 = client.post("/api/schedules/generate", json={"time_limit_seconds": 5}).json()
    s2 = client.post("/api/schedules/generate", json={
        "time_limit_seconds": 5,
        "parent_schedule_id": s1["schedule_id"],
        "scenario_description": "Test scenario"
    }).json()
    assert s2["version"] == s1["version"] + 1
    assert s2["parent_schedule_id"] == s1["schedule_id"]


def test_csv_import_resources():
    csv_content = b"resource_id,name,resource_type,capacity,availability_status,maintenance_status\nR-CSV-001,CSV Vehicle,transport_vehicle,5,available,operational\n"
    r = client.post("/api/import/csv/resources", files={"file": ("test.csv", csv_content, "text/csv")})
    assert r.status_code == 200
    assert r.json()["imported"] == 1


def test_csv_import_missing_column():
    csv_content = b"resource_id,name\nR-CSV-002,Test\n"
    r = client.post("/api/import/csv/resources", files={"file": ("test.csv", csv_content, "text/csv")})
    assert r.status_code == 400


def test_dashboard():
    client.post("/api/demo/load")
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "resources" in data
    assert data["resources"]["total"] > 0


# --- New tests ---

def test_task_scheduling_status_synced_after_generate():
    client.post("/api/demo/load")
    client.post("/api/schedules/generate", json={"time_limit_seconds": 10})
    tasks = client.get("/api/tasks").json()
    statuses = {t["scheduling_status"] for t in tasks}
    assert "scheduled" in statuses


def test_scenario_simulation():
    client.post("/api/demo/load")
    r = client.post("/api/scenarios", json={
        "description": "Test: mark resource unavailable",
        "resource_unavailable": "RES-001",
    })
    assert r.status_code == 200
    data = r.json()
    assert len(data["changes_applied"]) > 0
    assert data["new_schedule"]["schedule_id"].startswith("SCH-")


def test_scenario_with_staff_unavailable():
    client.post("/api/demo/load")
    r = client.post("/api/scenarios", json={
        "description": "Test: mark staff unavailable",
        "staff_unavailable": "STF-001",
    })
    assert r.status_code == 200
    assert any("STF-001" in c for c in r.json()["changes_applied"])


def test_constraint_create_and_list():
    r = client.post("/api/constraints", json={
        "constraint_id": "CON-TEST-001",
        "constraint_type": "maintenance_window",
        "entity_type": "resource",
        "entity_id": "RES-001",
        "start_time": "2026-07-14T06:00:00+00:00",
        "end_time": "2026-07-14T10:00:00+00:00",
        "reason": "Test constraint",
    })
    assert r.status_code == 201
    r2 = client.get("/api/constraints")
    assert any(c["constraint_id"] == "CON-TEST-001" for c in r2.json())


def test_constraint_deactivate():
    client.post("/api/constraints", json={
        "constraint_id": "CON-TEST-002",
        "constraint_type": "maintenance_window",
        "entity_type": "resource",
        "entity_id": "RES-002",
        "start_time": "2026-07-14T06:00:00+00:00",
        "end_time": "2026-07-14T10:00:00+00:00",
    })
    r = client.delete("/api/constraints/CON-TEST-002")
    assert r.status_code == 204


def test_csv_import_staff():
    csv_content = b"staff_id,name,role,skill_category,availability_status,availability_notes\nSTF-CSV-001,CSV Person,Driver,driving,available,\n"
    r = client.post("/api/import/csv/staff", files={"file": ("test.csv", csv_content, "text/csv")})
    assert r.status_code == 200
    assert r.json()["imported"] == 1


def test_csv_import_tasks():
    csv_content = b"task_id,title,category,description,duration_minutes,priority,earliest_start,deadline,required_resource_type,required_skill\nTSK-CSV-001,CSV Task,training,desc,60,3,2026-07-14T06:00:00+00:00,2026-07-14T14:00:00+00:00,training_facility,instruction\n"
    r = client.post("/api/import/csv/tasks", files={"file": ("test.csv", csv_content, "text/csv")})
    assert r.status_code == 200
    assert r.json()["imported"] == 1


def test_schedule_list_pagination():
    client.post("/api/demo/load")
    client.post("/api/schedules/generate", json={"time_limit_seconds": 5})
    r = client.get("/api/schedules?skip=0&limit=1")
    assert r.status_code == 200
    assert len(r.json()) <= 1


def test_resource_update():
    client.post("/api/resources", json={
        "resource_id": "R-UPD-001", "name": "Old Name", "resource_type": "transport_vehicle",
        "capacity": 1, "availability_status": "available", "maintenance_status": "operational",
    })
    r = client.put("/api/resources/R-UPD-001", json={"name": "New Name"})
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"


def test_staff_update():
    client.post("/api/staff", json={
        "staff_id": "S-UPD-001", "name": "Old", "role": "Driver",
        "skill_category": "driving", "availability_status": "available",
    })
    r = client.put("/api/staff/S-UPD-001", json={"availability_status": "unavailable"})
    assert r.status_code == 200
    assert r.json()["availability_status"] == "unavailable"


def test_get_schedule_by_id():
    client.post("/api/demo/load")
    gen = client.post("/api/schedules/generate", json={"time_limit_seconds": 5}).json()
    r = client.get(f"/api/schedules/{gen['schedule_id']}")
    assert r.status_code == 200
    assert r.json()["schedule_id"] == gen["schedule_id"]


def test_schedule_has_assignments():
    client.post("/api/demo/load")
    gen = client.post("/api/schedules/generate", json={"time_limit_seconds": 10}).json()
    r = client.get(f"/api/schedules/{gen['schedule_id']}")
    assert len(r.json()["assignments"]) > 0


def test_assignments_have_explanations():
    client.post("/api/demo/load")
    gen = client.post("/api/schedules/generate", json={"time_limit_seconds": 10}).json()
    r = client.get(f"/api/schedules/{gen['schedule_id']}")
    scheduled = [a for a in r.json()["assignments"] if a["is_scheduled"]]
    assert all(a["explanation"] is not None for a in scheduled)
