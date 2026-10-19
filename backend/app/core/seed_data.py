"""
Deterministic synthetic seed data for AirOps demo.
All data is fictional and for demonstration purposes only.
"""
from datetime import datetime, timezone, timedelta

BASE = datetime(2026, 7, 14, 6, 0, 0, tzinfo=timezone.utc)

RESOURCES = [
    {"resource_id": "RES-001", "name": "Transport Truck Alpha", "resource_type": "transport_vehicle", "capacity": 10, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-002", "name": "Transport Truck Bravo", "resource_type": "transport_vehicle", "capacity": 10, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-003", "name": "Transport Truck Charlie", "resource_type": "transport_vehicle", "capacity": 8, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-004", "name": "Logistics Van Delta", "resource_type": "transport_vehicle", "capacity": 4, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-005", "name": "Training Hall A", "resource_type": "training_facility", "capacity": 30, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-006", "name": "Training Hall B", "resource_type": "training_facility", "capacity": 25, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-007", "name": "Simulation Lab 1", "resource_type": "training_facility", "capacity": 15, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-008", "name": "Maintenance Bay 1", "resource_type": "maintenance_bay", "capacity": 2, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-009", "name": "Maintenance Bay 2", "resource_type": "maintenance_bay", "capacity": 2, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-010", "name": "Fuel Depot North", "resource_type": "fuel_depot", "capacity": 5, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-011", "name": "Fuel Depot South", "resource_type": "fuel_depot", "capacity": 5, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-012", "name": "Cargo Loader Echo", "resource_type": "cargo_equipment", "capacity": 1, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-013", "name": "Cargo Loader Foxtrot", "resource_type": "cargo_equipment", "capacity": 1, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-014", "name": "Admin Office Block 1", "resource_type": "admin_facility", "capacity": 20, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-015", "name": "Briefing Room Gamma", "resource_type": "admin_facility", "capacity": 12, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-016", "name": "Heavy Lift Crane", "resource_type": "cargo_equipment", "capacity": 1, "availability_status": "maintenance", "maintenance_status": "under_maintenance", "availability_notes": "Scheduled overhaul until end of week"},
    {"resource_id": "RES-017", "name": "Refrigerated Van Golf", "resource_type": "transport_vehicle", "capacity": 3, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-018", "name": "Outdoor Training Ground", "resource_type": "training_facility", "capacity": 50, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-019", "name": "Workshop Bay 3", "resource_type": "maintenance_bay", "capacity": 3, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
    {"resource_id": "RES-020", "name": "Command Vehicle Hotel", "resource_type": "transport_vehicle", "capacity": 6, "availability_status": "available", "maintenance_status": "operational", "availability_notes": None},
]

STAFF = [
    {"staff_id": "STF-001", "name": "Cpl. Arjun Mehta", "role": "Driver", "skill_category": "driving", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-002", "name": "Cpl. Priya Sharma", "role": "Driver", "skill_category": "driving", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-003", "name": "Sgt. Ravi Kumar", "role": "Logistics Coordinator", "skill_category": "logistics", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-004", "name": "Sgt. Anita Desai", "role": "Logistics Coordinator", "skill_category": "logistics", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-005", "name": "Lt. Vikram Singh", "role": "Training Instructor", "skill_category": "instruction", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-006", "name": "Lt. Meera Nair", "role": "Training Instructor", "skill_category": "instruction", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-007", "name": "Tech. Suresh Pillai", "role": "Maintenance Technician", "skill_category": "maintenance", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-008", "name": "Tech. Kavya Reddy", "role": "Maintenance Technician", "skill_category": "maintenance", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-009", "name": "Cpl. Deepak Joshi", "role": "Cargo Handler", "skill_category": "cargo_handling", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-010", "name": "Cpl. Sunita Rao", "role": "Cargo Handler", "skill_category": "cargo_handling", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-011", "name": "Maj. Arun Verma", "role": "Operations Officer", "skill_category": "operations", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-012", "name": "Capt. Neha Gupta", "role": "Admin Officer", "skill_category": "administration", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-013", "name": "Tech. Ramesh Iyer", "role": "Fuel Technician", "skill_category": "fuel_handling", "availability_status": "available", "availability_notes": None},
    {"staff_id": "STF-014", "name": "Sgt. Pooja Tiwari", "role": "Logistics Coordinator", "skill_category": "logistics", "availability_status": "unavailable", "availability_notes": "On leave until 2026-07-16"},
    {"staff_id": "STF-015", "name": "Cpl. Manish Yadav", "role": "Driver", "skill_category": "driving", "availability_status": "available", "availability_notes": None},
]

def _dt(hours_offset: float) -> str:
    dt = BASE + timedelta(hours=hours_offset)
    return dt.isoformat()

TASKS = [
    # Training tasks
    {"task_id": "TSK-001", "title": "Basic Logistics Orientation", "category": "training", "description": "Introductory training for new logistics personnel", "duration_minutes": 120, "priority": 2, "earliest_start": _dt(0), "deadline": _dt(8), "required_resource_type": "training_facility", "required_skill": "instruction"},
    {"task_id": "TSK-002", "title": "Vehicle Safety Refresher", "category": "training", "description": "Annual vehicle safety refresher course", "duration_minutes": 90, "priority": 2, "earliest_start": _dt(0), "deadline": _dt(10), "required_resource_type": "training_facility", "required_skill": "instruction"},
    {"task_id": "TSK-003", "title": "Cargo Handling Certification", "category": "training", "description": "Certification training for cargo handlers", "duration_minutes": 180, "priority": 3, "earliest_start": _dt(2), "deadline": _dt(12), "required_resource_type": "training_facility", "required_skill": "instruction"},
    {"task_id": "TSK-004", "title": "Emergency Procedures Drill", "category": "training", "description": "Quarterly emergency procedures drill", "duration_minutes": 60, "priority": 1, "earliest_start": _dt(0), "deadline": _dt(6), "required_resource_type": "training_facility", "required_skill": "instruction"},
    {"task_id": "TSK-005", "title": "Fuel Handling Safety Training", "category": "training", "description": "Safety training for fuel depot personnel", "duration_minutes": 90, "priority": 2, "earliest_start": _dt(4), "deadline": _dt(14), "required_resource_type": "training_facility", "required_skill": "instruction"},
    # Transport tasks
    {"task_id": "TSK-006", "title": "Supply Run to Depot Alpha", "category": "routine_transportation", "description": "Routine supply delivery to northern depot", "duration_minutes": 150, "priority": 2, "earliest_start": _dt(1), "deadline": _dt(9), "required_resource_type": "transport_vehicle", "required_skill": "driving"},
    {"task_id": "TSK-007", "title": "Personnel Transfer Batch A", "category": "routine_transportation", "description": "Transfer of personnel to training site", "duration_minutes": 60, "priority": 3, "earliest_start": _dt(0), "deadline": _dt(8), "required_resource_type": "transport_vehicle", "required_skill": "driving"},
    {"task_id": "TSK-008", "title": "Equipment Delivery to Workshop", "category": "routine_transportation", "description": "Delivery of maintenance equipment", "duration_minutes": 90, "priority": 3, "earliest_start": _dt(2), "deadline": _dt(10), "required_resource_type": "transport_vehicle", "required_skill": "driving"},
    {"task_id": "TSK-009", "title": "Ration Supply Distribution", "category": "routine_transportation", "description": "Distribution of rations to field units", "duration_minutes": 120, "priority": 2, "earliest_start": _dt(0), "deadline": _dt(7), "required_resource_type": "transport_vehicle", "required_skill": "driving"},
    {"task_id": "TSK-010", "title": "Medical Supplies Transport", "category": "routine_transportation", "description": "Transport of medical supplies to clinic", "duration_minutes": 45, "priority": 1, "earliest_start": _dt(0), "deadline": _dt(4), "required_resource_type": "transport_vehicle", "required_skill": "driving"},
    {"task_id": "TSK-011", "title": "Refrigerated Cargo Run", "category": "routine_transportation", "description": "Temperature-sensitive cargo delivery", "duration_minutes": 90, "priority": 2, "earliest_start": _dt(1), "deadline": _dt(8), "required_resource_type": "transport_vehicle", "required_skill": "driving"},
    # Maintenance tasks
    {"task_id": "TSK-012", "title": "Vehicle Fleet Inspection", "category": "maintenance_coordination", "description": "Routine inspection of transport fleet", "duration_minutes": 120, "priority": 2, "earliest_start": _dt(0), "deadline": _dt(8), "required_resource_type": "maintenance_bay", "required_skill": "maintenance"},
    {"task_id": "TSK-013", "title": "Generator Servicing", "category": "maintenance_coordination", "description": "Scheduled servicing of backup generators", "duration_minutes": 180, "priority": 3, "earliest_start": _dt(2), "deadline": _dt(14), "required_resource_type": "maintenance_bay", "required_skill": "maintenance"},
    {"task_id": "TSK-014", "title": "Communication Equipment Check", "category": "maintenance_coordination", "description": "Routine check of communication equipment", "duration_minutes": 60, "priority": 2, "earliest_start": _dt(0), "deadline": _dt(6), "required_resource_type": "maintenance_bay", "required_skill": "maintenance"},
    {"task_id": "TSK-015", "title": "Fuel System Inspection", "category": "maintenance_coordination", "description": "Inspection of fuel storage and distribution systems", "duration_minutes": 90, "priority": 2, "earliest_start": _dt(3), "deadline": _dt(12), "required_resource_type": "fuel_depot", "required_skill": "fuel_handling"},
    # Logistics tasks
    {"task_id": "TSK-016", "title": "Inventory Audit - Warehouse A", "category": "general_logistics", "description": "Quarterly inventory audit", "duration_minutes": 180, "priority": 3, "earliest_start": _dt(0), "deadline": _dt(10), "required_resource_type": "admin_facility", "required_skill": "logistics"},
    {"task_id": "TSK-017", "title": "Cargo Loading - Batch B", "category": "general_logistics", "description": "Loading of outbound cargo batch", "duration_minutes": 90, "priority": 2, "earliest_start": _dt(1), "deadline": _dt(8), "required_resource_type": "cargo_equipment", "required_skill": "cargo_handling"},
    {"task_id": "TSK-018", "title": "Cargo Unloading - Inbound", "category": "general_logistics", "description": "Unloading of inbound supply shipment", "duration_minutes": 90, "priority": 2, "earliest_start": _dt(0), "deadline": _dt(7), "required_resource_type": "cargo_equipment", "required_skill": "cargo_handling"},
    {"task_id": "TSK-019", "title": "Supply Chain Status Briefing", "category": "general_logistics", "description": "Weekly supply chain status review", "duration_minutes": 60, "priority": 3, "earliest_start": _dt(0), "deadline": _dt(8), "required_resource_type": "admin_facility", "required_skill": "logistics"},
    {"task_id": "TSK-020", "title": "Fuel Depot Replenishment", "category": "general_logistics", "description": "Replenishment of fuel depot stocks", "duration_minutes": 120, "priority": 2, "earliest_start": _dt(2), "deadline": _dt(10), "required_resource_type": "fuel_depot", "required_skill": "fuel_handling"},
    {"task_id": "TSK-021", "title": "Maintenance Parts Procurement", "category": "general_logistics", "description": "Procurement coordination for maintenance parts", "duration_minutes": 90, "priority": 3, "earliest_start": _dt(0), "deadline": _dt(12), "required_resource_type": "admin_facility", "required_skill": "administration"},
    {"task_id": "TSK-022", "title": "Personnel Records Update", "category": "general_logistics", "description": "Administrative update of personnel records", "duration_minutes": 60, "priority": 4, "earliest_start": _dt(0), "deadline": _dt(16), "required_resource_type": "admin_facility", "required_skill": "administration"},
    # Conflict scenario: TSK-023 and TSK-024 both need the same resource type at the same time
    {"task_id": "TSK-023", "title": "Urgent Cargo Transfer Alpha", "category": "general_logistics", "description": "High-priority cargo transfer - conflicts with TSK-024", "duration_minutes": 120, "priority": 1, "earliest_start": _dt(0), "deadline": _dt(4), "required_resource_type": "cargo_equipment", "required_skill": "cargo_handling"},
    {"task_id": "TSK-024", "title": "Urgent Cargo Transfer Bravo", "category": "general_logistics", "description": "High-priority cargo transfer - may conflict with TSK-023", "duration_minutes": 120, "priority": 1, "earliest_start": _dt(0), "deadline": _dt(4), "required_resource_type": "cargo_equipment", "required_skill": "cargo_handling"},
    # Infeasible task: deadline too tight
    {"task_id": "TSK-025", "title": "Impossible Quick Turnaround", "category": "maintenance_coordination", "description": "Infeasible: 300-minute task with only 60-minute window", "duration_minutes": 300, "priority": 5, "earliest_start": _dt(0), "deadline": _dt(1), "required_resource_type": "maintenance_bay", "required_skill": "maintenance"},
    # Additional tasks
    {"task_id": "TSK-026", "title": "Night Shift Logistics Handover", "category": "general_logistics", "description": "End-of-day logistics handover briefing", "duration_minutes": 45, "priority": 3, "earliest_start": _dt(8), "deadline": _dt(16), "required_resource_type": "admin_facility", "required_skill": "logistics"},
    {"task_id": "TSK-027", "title": "Driver Fatigue Assessment", "category": "training", "description": "Mandatory fatigue assessment for drivers", "duration_minutes": 30, "priority": 2, "earliest_start": _dt(0), "deadline": _dt(8), "required_resource_type": "admin_facility", "required_skill": "administration"},
    {"task_id": "TSK-028", "title": "Outdoor Navigation Exercise", "category": "training", "description": "Field navigation training exercise", "duration_minutes": 240, "priority": 3, "earliest_start": _dt(2), "deadline": _dt(14), "required_resource_type": "training_facility", "required_skill": "instruction"},
    {"task_id": "TSK-029", "title": "Fuel Quality Testing", "category": "maintenance_coordination", "description": "Routine fuel quality testing at depot", "duration_minutes": 60, "priority": 2, "earliest_start": _dt(1), "deadline": _dt(8), "required_resource_type": "fuel_depot", "required_skill": "fuel_handling"},
    {"task_id": "TSK-030", "title": "Vehicle Tyre Rotation", "category": "maintenance_coordination", "description": "Scheduled tyre rotation for transport fleet", "duration_minutes": 90, "priority": 4, "earliest_start": _dt(4), "deadline": _dt(16), "required_resource_type": "maintenance_bay", "required_skill": "maintenance"},
]

CONSTRAINTS = [
    {
        "constraint_id": "CON-001",
        "constraint_type": "maintenance_window",
        "entity_type": "resource",
        "entity_id": "RES-016",
        "start_time": (BASE - timedelta(hours=24)).isoformat(),
        "end_time": (BASE + timedelta(hours=72)).isoformat(),
        "reason": "Scheduled overhaul of Heavy Lift Crane",
    },
    {
        "constraint_id": "CON-002",
        "constraint_type": "staff_unavailability",
        "entity_type": "staff",
        "entity_id": "STF-014",
        "start_time": (BASE - timedelta(hours=48)).isoformat(),
        "end_time": (BASE + timedelta(hours=48)).isoformat(),
        "reason": "Annual leave",
    },
    {
        "constraint_id": "CON-003",
        "constraint_type": "facility_restriction",
        "entity_type": "resource",
        "entity_id": "RES-007",
        "start_time": (BASE + timedelta(hours=6)).isoformat(),
        "end_time": (BASE + timedelta(hours=10)).isoformat(),
        "reason": "Simulation Lab 1 reserved for external inspection",
    },
]
