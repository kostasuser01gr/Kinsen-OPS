-- ============================================================
-- KINSEN OPS — Full Database Schema
-- Supabase PostgreSQL Migration
-- Generated from Prisma schema (940 lines, 25+ models)
-- ============================================================
-- DELIVERABLE 1: Full SQL Schema
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM TYPES ─────────────────────────────────────────────

CREATE TYPE role_type AS ENUM (
  'BRANCH_AGENT',
  'SHIFT_SUPERVISOR',
  'BRANCH_MANAGER',
  'FLEET_COORDINATOR',
  'DAMAGE_CLAIMS_STAFF',
  'FINANCE_STAFF',
  'FINANCE_MANAGER',
  'OPERATIONS_DIRECTOR',
  'ADMIN',
  'AUDITOR'
);

CREATE TYPE vehicle_status AS ENUM (
  'AVAILABLE',
  'RESERVED_PREP_PENDING',
  'PICKUP_READY',
  'ON_RENT',
  'RETURN_PENDING_CHECKIN',
  'INSPECTION_IN_PROGRESS',
  'CLEANING_PENDING',
  'MAINTENANCE_PENDING',
  'DAMAGE_HOLD',
  'COMPLIANCE_HOLD',
  'TRANSFER_PENDING',
  'TRANSFER_IN_TRANSIT',
  'OUT_OF_SERVICE'
);

CREATE TYPE vehicle_class AS ENUM (
  'ECONOMY', 'COMPACT', 'MIDSIZE', 'FULLSIZE',
  'SUV', 'LUXURY', 'VAN', 'TRUCK'
);

CREATE TYPE rental_status AS ENUM (
  'DRAFT', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING', 'PARTIAL', 'PAID', 'OVERDUE',
  'REFUND_PENDING', 'REFUNDED', 'VOID'
);

CREATE TYPE deposit_status AS ENUM (
  'HELD', 'PARTIAL_RELEASE', 'RELEASED', 'FORFEITED'
);

CREATE TYPE task_priority AS ENUM (
  'LOW', 'MEDIUM', 'HIGH', 'URGENT'
);

CREATE TYPE task_status AS ENUM (
  'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED'
);

CREATE TYPE linked_entity_type AS ENUM (
  'VEHICLE', 'RENTAL', 'INCIDENT', 'PAYMENT', 'BRANCH', 'SHIFT'
);

CREATE TYPE incident_severity AS ENUM (
  'MINOR', 'MODERATE', 'MAJOR', 'CRITICAL'
);

CREATE TYPE incident_status AS ENUM (
  'REPORTED', 'UNDER_REVIEW', 'VERIFIED',
  'AWAITING_APPROVAL', 'RESOLVED', 'CLOSED'
);

CREATE TYPE claims_status AS ENUM (
  'NOT_APPLICABLE', 'PENDING', 'FILED',
  'IN_PROGRESS', 'SETTLED', 'DENIED'
);

CREATE TYPE payment_method AS ENUM (
  'CASH', 'CREDIT_CARD', 'DEBIT_CARD',
  'BANK_TRANSFER', 'ONLINE', 'OTHER'
);

CREATE TYPE payment_type AS ENUM (
  'RENTAL_CHARGE', 'DEPOSIT', 'DEPOSIT_REFUND',
  'DAMAGE_CHARGE', 'FUEL_CHARGE', 'LATE_FEE',
  'EXTRA_CHARGE', 'REFUND', 'ADJUSTMENT'
);

CREATE TYPE reconciliation_state AS ENUM (
  'UNRECONCILED', 'MATCHED', 'MISMATCHED', 'EXCEPTION'
);

CREATE TYPE channel_type AS ENUM (
  'DIRECT', 'TEAM', 'BRANCH', 'DEPARTMENT', 'CONTEXTUAL'
);

CREATE TYPE readiness_state AS ENUM (
  'READY', 'NEEDS_CLEANING', 'NEEDS_FUEL',
  'NEEDS_INSPECTION', 'BLOCKED'
);

CREATE TYPE compliance_status AS ENUM (
  'COMPLIANT', 'EXPIRING_SOON', 'NON_COMPLIANT'
);

CREATE TYPE inspection_type AS ENUM (
  'PICKUP', 'RETURN', 'PERIODIC', 'POST_MAINTENANCE'
);

CREATE TYPE inspection_status AS ENUM (
  'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'
);

CREATE TYPE checkpoint_condition AS ENUM (
  'OK', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'MISSING'
);

CREATE TYPE checkpoint_category AS ENUM (
  'EXTERIOR', 'INTERIOR', 'MECHANICAL', 'DOCUMENTS'
);

CREATE TYPE maintenance_type AS ENUM (
  'SCHEDULED', 'UNSCHEDULED', 'EMERGENCY', 'RECALL'
);

CREATE TYPE maintenance_priority AS ENUM (
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
);

CREATE TYPE maintenance_status AS ENUM (
  'REQUESTED', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS',
  'PAUSED', 'COMPLETED', 'NEEDS_RECHECK', 'CANCELLED', 'DENIED'
);

CREATE TYPE fleet_impact AS ENUM (
  'AVAILABLE_AFTER', 'NEEDS_INSPECTION', 'OUT_OF_SERVICE'
);

CREATE TYPE claim_status AS ENUM (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO',
  'APPROVED', 'DENIED', 'APPEAL', 'SETTLED', 'CLOSED'
);

CREATE TYPE claim_type AS ENUM (
  'INSURANCE', 'CUSTOMER_LIABILITY', 'INTERNAL'
);

CREATE TYPE responsible_party AS ENUM (
  'CUSTOMER', 'THIRD_PARTY', 'COMPANY', 'UNKNOWN'
);

CREATE TYPE approval_type AS ENUM (
  'REFUND', 'OVERRIDE', 'TRANSFER', 'WAIVER',
  'MAINTENANCE', 'CLAIM_SETTLEMENT', 'STATUS_OVERRIDE', 'BACKDATED_EDIT'
);

CREATE TYPE approval_status AS ENUM (
  'PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'ESCALATED'
);

CREATE TYPE notification_type AS ENUM (
  'TASK_ASSIGNED', 'TASK_OVERDUE', 'APPROVAL_REQUESTED',
  'APPROVAL_DECIDED', 'INCIDENT_CREATED', 'MAINTENANCE_UPDATE',
  'SHIFT_HANDOVER', 'SYSTEM_ALERT'
);

CREATE TYPE customer_eligibility AS ENUM (
  'ELIGIBLE', 'REVIEW_REQUIRED', 'BLOCKED'
);

CREATE TYPE shift_status AS ENUM (
  'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE evidence_type AS ENUM (
  'PHOTO', 'VIDEO', 'DOCUMENT', 'NOTE'
);

-- ─── CORE TABLES ────────────────────────────────────────────

-- ── Branches ──

CREATE TABLE branches (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  address     TEXT,
  phone       TEXT,
  timezone    TEXT NOT NULL DEFAULT 'UTC',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Users ──

CREATE TABLE users (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth_id          UUID UNIQUE,  -- links to Supabase auth.users.id
  identifier       TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  pin_hash         TEXT NOT NULL,
  email            TEXT,
  password_hash    TEXT,
  role             role_type NOT NULL DEFAULT 'BRANCH_AGENT',
  branch_id        TEXT REFERENCES branches(id),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  failed_attempts  INT NOT NULL DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  last_login_at    TIMESTAMPTZ,
  avatar_url       TEXT,
  phone            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth ON users(auth_id);

-- ── Vehicles ──

CREATE TABLE vehicles (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plate                 TEXT NOT NULL UNIQUE,
  vin                   TEXT UNIQUE,
  internal_code         TEXT UNIQUE,
  branch_id             TEXT NOT NULL REFERENCES branches(id),
  class                 vehicle_class NOT NULL,
  make                  TEXT NOT NULL,
  model                 TEXT NOT NULL,
  year                  INT NOT NULL,
  color                 TEXT,
  status                vehicle_status NOT NULL DEFAULT 'AVAILABLE',
  readiness_state       readiness_state NOT NULL DEFAULT 'READY',
  compliance_status     compliance_status NOT NULL DEFAULT 'COMPLIANT',
  mileage               INT NOT NULL DEFAULT 0,
  fuel_level            INT CHECK (fuel_level IS NULL OR (fuel_level >= 0 AND fuel_level <= 100)),
  next_service_due      TIMESTAMPTZ,
  next_insurance_due    TIMESTAMPTZ,
  next_registration_due TIMESTAMPTZ,
  downtime_start        TIMESTAMPTZ,
  downtime_reason       TEXT,
  current_rental_id     TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_branch_status ON vehicles(branch_id, status);
CREATE INDEX idx_vehicles_plate ON vehicles(plate);
CREATE INDEX idx_vehicles_class ON vehicles(class);
CREATE INDEX idx_vehicles_compliance ON vehicles(compliance_status) WHERE compliance_status != 'COMPLIANT';

-- ── Vehicle Status History (audit trail for lifecycle) ──

CREATE TABLE vehicle_status_history (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id  TEXT NOT NULL REFERENCES vehicles(id),
  from_status vehicle_status NOT NULL,
  to_status   vehicle_status NOT NULL,
  reason      TEXT,
  actor_id    TEXT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vsh_vehicle_time ON vehicle_status_history(vehicle_id, created_at DESC);
CREATE INDEX idx_vsh_actor ON vehicle_status_history(actor_id);

-- ── Customers ──

CREATE TABLE customers (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT,
  phone               TEXT NOT NULL,
  license_number      TEXT NOT NULL,
  id_document         TEXT,
  address             TEXT,
  eligibility_status  customer_eligibility NOT NULL DEFAULT 'ELIGIBLE',
  flags               TEXT[] NOT NULL DEFAULT '{}',
  notes               TEXT,
  restricted_notes    TEXT,  -- visible only to Branch Manager+
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_name ON customers(last_name, first_name);
CREATE INDEX idx_customers_license ON customers(license_number);

-- ── Rentals ──

CREATE TABLE rentals (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contract_number      TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  customer_id          TEXT NOT NULL REFERENCES customers(id),
  vehicle_id           TEXT NOT NULL REFERENCES vehicles(id),
  branch_out_id        TEXT NOT NULL REFERENCES branches(id),
  branch_in_id         TEXT REFERENCES branches(id),
  pickup_time          TIMESTAMPTZ NOT NULL,
  return_time          TIMESTAMPTZ,
  actual_return_time   TIMESTAMPTZ,
  status               rental_status NOT NULL DEFAULT 'DRAFT',
  payment_status       payment_status NOT NULL DEFAULT 'PENDING',
  deposit_status       deposit_status,
  deposit_amount       DECIMAL(10,2),
  total_amount         DECIMAL(10,2),
  daily_rate           DECIMAL(10,2) NOT NULL,
  pickup_inspection_id TEXT,
  return_inspection_id TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_customer ON rentals(customer_id);
CREATE INDEX idx_rentals_vehicle ON rentals(vehicle_id);
CREATE INDEX idx_rentals_branch_out ON rentals(branch_out_id);
CREATE INDEX idx_rentals_pickup ON rentals(pickup_time);

-- ── Payments ──

CREATE TABLE payments (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  rental_id             TEXT NOT NULL REFERENCES rentals(id),
  amount                DECIMAL(10,2) NOT NULL,
  method                payment_method NOT NULL,
  status                payment_status NOT NULL DEFAULT 'PENDING',
  type                  payment_type NOT NULL,
  reconciliation_state  reconciliation_state NOT NULL DEFAULT 'UNRECONCILED',
  invoice_ref           TEXT,
  receipt_ref           TEXT,
  approved_by_id        TEXT REFERENCES users(id),
  reason                TEXT,
  notes                 TEXT,
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_rental ON payments(rental_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_reconciliation ON payments(reconciliation_state) WHERE reconciliation_state != 'MATCHED';

-- ─── OPERATIONS TABLES ──────────────────────────────────────

-- ── Shifts ──

CREATE TABLE shifts (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id       TEXT NOT NULL REFERENCES branches(id),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
  supervisor_id   TEXT NOT NULL REFERENCES users(id),
  handover_notes  TEXT,
  status          shift_status NOT NULL DEFAULT 'SCHEDULED',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shifts_branch_time ON shifts(branch_id, start_time DESC);
CREATE INDEX idx_shifts_supervisor ON shifts(supervisor_id);
CREATE INDEX idx_shifts_status ON shifts(status) WHERE status IN ('SCHEDULED', 'ACTIVE');

-- ── Tasks ──

CREATE TABLE tasks (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  linked_entity_type linked_entity_type,
  linked_entity_id  TEXT,
  assignee_id       TEXT REFERENCES users(id),
  creator_id        TEXT NOT NULL REFERENCES users(id),
  priority          task_priority NOT NULL DEFAULT 'MEDIUM',
  due_at            TIMESTAMPTZ,
  sla_deadline      TIMESTAMPTZ,
  escalation_level  INT NOT NULL DEFAULT 0,
  source_type       TEXT,
  source_id         TEXT,
  status            task_status NOT NULL DEFAULT 'PENDING',
  branch_id         TEXT NOT NULL REFERENCES branches(id),
  shift_id          TEXT REFERENCES shifts(id),
  handover_notes    TEXT,
  checklist_items   JSONB,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_branch ON tasks(branch_id);
CREATE INDEX idx_tasks_due ON tasks(due_at) WHERE status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX idx_tasks_linked ON tasks(linked_entity_type, linked_entity_id);
CREATE INDEX idx_tasks_overdue ON tasks(sla_deadline) WHERE status NOT IN ('COMPLETED', 'CANCELLED') AND sla_deadline IS NOT NULL;

-- ── Incidents ──

CREATE TABLE incidents (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id                TEXT NOT NULL REFERENCES vehicles(id),
  branch_id                 TEXT NOT NULL REFERENCES branches(id),
  rental_id                 TEXT,
  severity                  incident_severity NOT NULL,
  description               TEXT NOT NULL,
  damage_zones              TEXT[] NOT NULL DEFAULT '{}',
  responsible_party         responsible_party NOT NULL DEFAULT 'UNKNOWN',
  status                    incident_status NOT NULL DEFAULT 'REPORTED',
  claims_status             claims_status NOT NULL DEFAULT 'NOT_APPLICABLE',
  financial_impact_estimate DECIMAL(10,2),
  insurer_ref               TEXT,
  restricted_notes          TEXT,
  reported_by_id            TEXT NOT NULL REFERENCES users(id),
  resolved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_vehicle ON incidents(vehicle_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_branch ON incidents(branch_id);
CREATE INDEX idx_incidents_severity ON incidents(severity) WHERE status NOT IN ('RESOLVED', 'CLOSED');

-- ── Incident Evidence ──

CREATE TABLE incident_evidence (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id     TEXT NOT NULL REFERENCES incidents(id),
  type            evidence_type NOT NULL,
  url             TEXT NOT NULL,
  description     TEXT,
  uploaded_by_id  TEXT NOT NULL REFERENCES users(id),
  upload_context  TEXT,
  is_immutable    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_incident ON incident_evidence(incident_id);

-- ─── INSPECTION & MAINTENANCE ───────────────────────────────

-- ── Inspections ──

CREATE TABLE inspections (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  rental_id           TEXT NOT NULL REFERENCES rentals(id),
  vehicle_id          TEXT NOT NULL REFERENCES vehicles(id),
  type                inspection_type NOT NULL,
  inspector_id        TEXT NOT NULL REFERENCES users(id),
  branch_id           TEXT NOT NULL,
  status              inspection_status NOT NULL DEFAULT 'PENDING',
  fuel_level          INT,
  mileage             INT,
  overall_condition   TEXT,
  discrepancy_flag    BOOLEAN NOT NULL DEFAULT false,
  discrepancy_notes   TEXT,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspections_rental ON inspections(rental_id);
CREATE INDEX idx_inspections_vehicle ON inspections(vehicle_id);

-- ── Inspection Items ──

CREATE TABLE inspection_items (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inspection_id       TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  category            checkpoint_category NOT NULL,
  checkpoint_name     TEXT NOT NULL,
  condition           checkpoint_condition NOT NULL DEFAULT 'OK',
  photo_ref           TEXT,
  notes               TEXT,
  previous_condition  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspection_items_inspection ON inspection_items(inspection_id);

-- ── Maintenance Requests ──

CREATE TABLE maintenance_requests (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id          TEXT NOT NULL REFERENCES vehicles(id),
  branch_id           TEXT NOT NULL,
  requested_by_id     TEXT NOT NULL,
  type                maintenance_type NOT NULL,
  priority            maintenance_priority NOT NULL DEFAULT 'MEDIUM',
  status              maintenance_status NOT NULL DEFAULT 'REQUESTED',
  description         TEXT NOT NULL,
  estimated_cost      DECIMAL(10,2),
  actual_cost         DECIMAL(10,2),
  estimated_duration  INT,   -- minutes
  actual_duration     INT,   -- minutes
  scheduled_date      TIMESTAMPTZ,
  completed_date      TIMESTAMPTZ,
  technician_notes    TEXT,
  fleet_impact        fleet_impact NOT NULL DEFAULT 'AVAILABLE_AFTER',
  approved_by_id      TEXT,
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_vehicle ON maintenance_requests(vehicle_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);

-- ── Maintenance Parts ──

CREATE TABLE maintenance_parts (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  maintenance_request_id  TEXT NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  part_number             TEXT,
  quantity                INT NOT NULL DEFAULT 1,
  unit_cost               DECIMAL(10,2),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maint_parts_request ON maintenance_parts(maintenance_request_id);

-- ─── CLAIMS ─────────────────────────────────────────────────

CREATE TABLE claims (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id         TEXT NOT NULL REFERENCES incidents(id),
  vehicle_id          TEXT NOT NULL,
  rental_id           TEXT REFERENCES rentals(id),
  customer_id         TEXT REFERENCES customers(id),
  status              claim_status NOT NULL DEFAULT 'DRAFT',
  claim_type          claim_type NOT NULL,
  responsible_party   responsible_party NOT NULL DEFAULT 'UNKNOWN',
  amount              DECIMAL(10,2),
  currency            TEXT NOT NULL DEFAULT 'EUR',
  insurer_ref         TEXT,
  assessor_notes      TEXT,
  settlement_amount   DECIMAL(10,2),
  filed_by_id         TEXT NOT NULL,
  filed_at            TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claims_incident ON claims(incident_id);
CREATE INDEX idx_claims_status ON claims(status);

-- ── Claim Documents ──

CREATE TABLE claim_documents (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  claim_id    TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  url         TEXT NOT NULL,
  description TEXT,
  is_immutable BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claim_docs_claim ON claim_documents(claim_id);

-- ─── APPROVAL ENGINE ────────────────────────────────────────

CREATE TABLE approval_requests (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type              approval_type NOT NULL,
  requester_id      TEXT NOT NULL REFERENCES users(id),
  approver_id       TEXT REFERENCES users(id),
  status            approval_status NOT NULL DEFAULT 'PENDING',
  entity_type       TEXT NOT NULL,
  entity_id         TEXT NOT NULL,
  payload           JSONB NOT NULL,
  reason            TEXT NOT NULL,
  approver_notes    TEXT,
  escalation_level  INT NOT NULL DEFAULT 0,
  expires_at        TIMESTAMPTZ,
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at        TIMESTAMPTZ
);

CREATE INDEX idx_approvals_status_type ON approval_requests(status, type);
CREATE INDEX idx_approvals_requester ON approval_requests(requester_id);
CREATE INDEX idx_approvals_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX idx_approvals_pending ON approval_requests(status) WHERE status = 'PENDING';

-- ─── COMMUNICATION ──────────────────────────────────────────

-- ── Chat Channels ──

CREATE TABLE chat_channels (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name              TEXT,
  type              channel_type NOT NULL,
  branch_id         TEXT REFERENCES branches(id),
  linked_entity_type linked_entity_type,
  linked_entity_id  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_channels_branch ON chat_channels(branch_id);
CREATE INDEX idx_channels_entity ON chat_channels(linked_entity_type, linked_entity_id);

-- ── Chat Participants ──

CREATE TABLE chat_participants (
  channel_id  TEXT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id),
  last_read_at TIMESTAMPTZ,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

-- ── Chat Messages ──

CREATE TABLE chat_messages (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  channel_id          TEXT NOT NULL REFERENCES chat_channels(id),
  sender_id           TEXT NOT NULL REFERENCES users(id),
  content             TEXT NOT NULL,
  linked_entity_type  linked_entity_type,
  linked_entity_id    TEXT,
  converted_to_task_id TEXT,
  edited_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_channel_time ON chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_sender ON chat_messages(sender_id);

-- ─── NOTIFICATIONS ──────────────────────────────────────────

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id),
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  entity_type TEXT,
  entity_id   TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ─── AUDIT LOG ──────────────────────────────────────────────

CREATE TABLE audit_logs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor_id        TEXT NOT NULL REFERENCES users(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  previous_state  JSONB,
  new_state       JSONB,
  reason          TEXT,
  branch_id       TEXT REFERENCES branches(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_branch ON audit_logs(branch_id) WHERE branch_id IS NOT NULL;

-- ─── WORKSPACE / AI MODELS ─────────────────────────────────

CREATE TABLE conversations (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT,
  user_id     TEXT NOT NULL REFERENCES users(id),
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  tool_name       TEXT,
  tool_input      JSONB,
  tool_output     JSONB,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conv_time ON messages(conversation_id, created_at);

-- ─── SHORTCUTS ──────────────────────────────────────────────

CREATE TABLE shortcuts (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                      TEXT NOT NULL,
  description               TEXT,
  icon                      TEXT,
  action_type               TEXT NOT NULL,
  prompt_template           TEXT,
  tool_name                 TEXT,
  tool_sequence             JSONB,
  input_schema              JSONB,
  default_inputs            JSONB,
  output_mode               TEXT NOT NULL DEFAULT 'chat',
  required_context_keys     TEXT[] NOT NULL DEFAULT '{}',
  required_permissions      TEXT[] NOT NULL DEFAULT '{}',
  allowed_entity_states     TEXT[] NOT NULL DEFAULT '{}',
  permission_scope_required TEXT,
  visibility_scope          TEXT NOT NULL DEFAULT 'private',
  version                   INT NOT NULL DEFAULT 1,
  needs_repair              BOOLEAN NOT NULL DEFAULT false,
  repair_reason             TEXT,
  execution_count           INT NOT NULL DEFAULT 0,
  last_executed_at          TIMESTAMPTZ,
  created_by_id             TEXT NOT NULL REFERENCES users(id),
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shortcuts_creator ON shortcuts(created_by_id);
CREATE INDEX idx_shortcuts_visibility ON shortcuts(visibility_scope, is_active);

-- ─── LIFECYCLE ENFORCEMENT ──────────────────────────────────
-- Valid vehicle status transitions (enforced by trigger)

CREATE TABLE valid_vehicle_transitions (
  from_status vehicle_status NOT NULL,
  to_status   vehicle_status NOT NULL,
  required_role role_type,
  PRIMARY KEY (from_status, to_status)
);

INSERT INTO valid_vehicle_transitions (from_status, to_status, required_role) VALUES
  ('AVAILABLE',               'RESERVED_PREP_PENDING',    NULL),
  ('RESERVED_PREP_PENDING',   'PICKUP_READY',             NULL),
  ('RESERVED_PREP_PENDING',   'AVAILABLE',                NULL),       -- cancellation
  ('PICKUP_READY',            'ON_RENT',                  NULL),
  ('PICKUP_READY',            'AVAILABLE',                NULL),       -- no-show
  ('ON_RENT',                 'RETURN_PENDING_CHECKIN',    NULL),
  ('RETURN_PENDING_CHECKIN',  'INSPECTION_IN_PROGRESS',   NULL),
  ('INSPECTION_IN_PROGRESS',  'CLEANING_PENDING',         NULL),
  ('INSPECTION_IN_PROGRESS',  'DAMAGE_HOLD',              NULL),
  ('INSPECTION_IN_PROGRESS',  'MAINTENANCE_PENDING',      NULL),
  ('CLEANING_PENDING',        'AVAILABLE',                NULL),
  ('MAINTENANCE_PENDING',     'OUT_OF_SERVICE',           NULL),
  ('MAINTENANCE_PENDING',     'AVAILABLE',                NULL),
  ('DAMAGE_HOLD',             'MAINTENANCE_PENDING',      NULL),
  ('DAMAGE_HOLD',             'AVAILABLE',                'BRANCH_MANAGER'),
  ('COMPLIANCE_HOLD',         'AVAILABLE',                'FLEET_COORDINATOR'),
  ('COMPLIANCE_HOLD',         'OUT_OF_SERVICE',           NULL),
  ('OUT_OF_SERVICE',          'AVAILABLE',                'FLEET_COORDINATOR'),
  ('OUT_OF_SERVICE',          'MAINTENANCE_PENDING',      NULL),
  -- Transfer workflow
  ('AVAILABLE',               'TRANSFER_PENDING',         'BRANCH_MANAGER'),
  ('TRANSFER_PENDING',        'TRANSFER_IN_TRANSIT',      NULL),
  ('TRANSFER_PENDING',        'AVAILABLE',                NULL),       -- cancelled
  ('TRANSFER_IN_TRANSIT',     'AVAILABLE',                NULL),       -- arrived
  -- Emergency overrides (admin only)
  ('DAMAGE_HOLD',             'OUT_OF_SERVICE',           'ADMIN'),
  ('ON_RENT',                 'DAMAGE_HOLD',              'ADMIN');

-- ── Trigger: Enforce valid transitions ──

CREATE OR REPLACE FUNCTION enforce_vehicle_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM valid_vehicle_transitions
      WHERE from_status = OLD.status AND to_status = NEW.status
    ) THEN
      RAISE EXCEPTION 'Invalid vehicle status transition: % → %', OLD.status, NEW.status;
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vehicle_transition
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION enforce_vehicle_transition();

-- ── Trigger: Auto-record status history ──

CREATE OR REPLACE FUNCTION record_vehicle_status_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO vehicle_status_history (vehicle_id, from_status, to_status, reason, actor_id)
  VALUES (
    NEW.id,
    OLD.status,
    NEW.status,
    COALESCE(current_setting('app.status_change_reason', true), 'System transition'),
    COALESCE(current_setting('app.current_user_id', true), 'system')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_record_vehicle_status
  AFTER UPDATE ON vehicles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION record_vehicle_status_change();

-- ── Trigger: Auto-update updated_at ──

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables that have it
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name != 'vehicles'  -- vehicles already handled
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ─── PUBLICATION FOR REALTIME ───────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
