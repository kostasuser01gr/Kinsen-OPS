-- ============================================================
-- KINSEN OPS — Row Level Security Policies
-- DELIVERABLE 2: Complete RLS
-- ============================================================
-- PRINCIPLE: Default deny. Every table has RLS enabled.
-- Access determined by: user role + branch membership.
-- ============================================================

-- ─── HELPER FUNCTIONS ───────────────────────────────────────

-- Get current user's app-level ID from Supabase auth
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS TEXT AS $$
  SELECT id FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS role_type AS $$
  SELECT role FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's branch_id
CREATE OR REPLACE FUNCTION auth_user_branch()
RETURNS TEXT AS $$
  SELECT branch_id FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has one of the specified roles
CREATE OR REPLACE FUNCTION has_role(allowed_roles role_type[])
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() = ANY(allowed_roles);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is global (can see all branches)
CREATE OR REPLACE FUNCTION is_global_role()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() IN (
    'ADMIN', 'OPERATIONS_DIRECTOR', 'AUDITOR'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user can see a specific branch
CREATE OR REPLACE FUNCTION can_access_branch(target_branch TEXT)
RETURNS BOOLEAN AS $$
  SELECT is_global_role() OR auth_user_branch() = target_branch;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── ENABLE RLS ON ALL TABLES ───────────────────────────────

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortcuts ENABLE ROW LEVEL SECURITY;

-- ─── BRANCHES ───────────────────────────────────────────────
-- Everyone can read active branches. Only admins modify.

CREATE POLICY "branches_select"
  ON branches FOR SELECT
  USING (is_active = true OR is_global_role());

CREATE POLICY "branches_insert"
  ON branches FOR INSERT
  WITH CHECK (has_role(ARRAY['ADMIN'::role_type]));

CREATE POLICY "branches_update"
  ON branches FOR UPDATE
  USING (has_role(ARRAY['ADMIN'::role_type]));

-- ─── USERS ──────────────────────────────────────────────────
-- Users see own profile + same-branch users. Admins see all.

CREATE POLICY "users_select"
  ON users FOR SELECT
  USING (
    auth_id = auth.uid()                        -- own profile
    OR can_access_branch(branch_id)             -- same branch / global
  );

CREATE POLICY "users_insert"
  ON users FOR INSERT
  WITH CHECK (has_role(ARRAY['ADMIN'::role_type]));

CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (
    auth_id = auth.uid()
    AND role = (SELECT role FROM users WHERE auth_id = auth.uid())  -- cannot self-promote
  );

CREATE POLICY "users_update_admin"
  ON users FOR UPDATE
  USING (has_role(ARRAY['ADMIN'::role_type]));

-- ─── VEHICLES ───────────────────────────────────────────────
-- Branch-scoped. All ops roles can read. Modifications by role.

CREATE POLICY "vehicles_select"
  ON vehicles FOR SELECT
  USING (can_access_branch(branch_id));

CREATE POLICY "vehicles_insert"
  ON vehicles FOR INSERT
  WITH CHECK (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'FLEET_COORDINATOR'::role_type,
      'BRANCH_MANAGER'::role_type
    ])
    AND can_access_branch(branch_id)
  );

CREATE POLICY "vehicles_update"
  ON vehicles FOR UPDATE
  USING (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'FLEET_COORDINATOR'::role_type,
      'BRANCH_MANAGER'::role_type,
      'SHIFT_SUPERVISOR'::role_type,
      'BRANCH_AGENT'::role_type
    ])
    AND can_access_branch(branch_id)
  );

-- ─── VEHICLE STATUS HISTORY ────────────────────────────────
-- Read by branch. Insert by system trigger (SECURITY DEFINER).

CREATE POLICY "vsh_select"
  ON vehicle_status_history FOR SELECT
  USING (
    can_access_branch(
      (SELECT branch_id FROM vehicles WHERE id = vehicle_id)
    )
  );

-- ─── CUSTOMERS ──────────────────────────────────────────────
-- All ops staff can read. Only certain roles see restricted_notes.

CREATE POLICY "customers_select"
  ON customers FOR SELECT
  USING (true);  -- all authenticated users; restricted_notes filtered in app layer

CREATE POLICY "customers_insert"
  ON customers FOR INSERT
  WITH CHECK (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'BRANCH_MANAGER'::role_type,
      'BRANCH_AGENT'::role_type,
      'SHIFT_SUPERVISOR'::role_type
    ])
  );

CREATE POLICY "customers_update"
  ON customers FOR UPDATE
  USING (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'BRANCH_MANAGER'::role_type,
      'BRANCH_AGENT'::role_type
    ])
  );

-- ─── RENTALS ────────────────────────────────────────────────
-- Branch-scoped by branch_out or branch_in.

CREATE POLICY "rentals_select"
  ON rentals FOR SELECT
  USING (
    can_access_branch(branch_out_id)
    OR can_access_branch(COALESCE(branch_in_id, branch_out_id))
  );

CREATE POLICY "rentals_insert"
  ON rentals FOR INSERT
  WITH CHECK (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'BRANCH_MANAGER'::role_type,
      'BRANCH_AGENT'::role_type,
      'SHIFT_SUPERVISOR'::role_type
    ])
    AND can_access_branch(branch_out_id)
  );

CREATE POLICY "rentals_update"
  ON rentals FOR UPDATE
  USING (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'BRANCH_MANAGER'::role_type,
      'BRANCH_AGENT'::role_type,
      'SHIFT_SUPERVISOR'::role_type
    ])
    AND can_access_branch(branch_out_id)
  );

-- ─── PAYMENTS ───────────────────────────────────────────────
-- Finance roles + branch managers can see. Reception cannot modify adjustments.

CREATE POLICY "payments_select"
  ON payments FOR SELECT
  USING (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'FINANCE_STAFF'::role_type,
      'FINANCE_MANAGER'::role_type,
      'OPERATIONS_DIRECTOR'::role_type,
      'AUDITOR'::role_type,
      'BRANCH_MANAGER'::role_type,
      'SHIFT_SUPERVISOR'::role_type,
      'BRANCH_AGENT'::role_type
    ])
  );

CREATE POLICY "payments_insert"
  ON payments FOR INSERT
  WITH CHECK (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'FINANCE_STAFF'::role_type,
      'FINANCE_MANAGER'::role_type,
      'BRANCH_MANAGER'::role_type,
      'BRANCH_AGENT'::role_type
    ])
  );

CREATE POLICY "payments_update"
  ON payments FOR UPDATE
  USING (
    -- BRANCH_AGENT cannot update ADJUSTMENT or REFUND type payments
    CASE
      WHEN auth_user_role() = 'BRANCH_AGENT' THEN
        type NOT IN ('ADJUSTMENT', 'REFUND')
      ELSE
        has_role(ARRAY[
          'ADMIN'::role_type,
          'FINANCE_STAFF'::role_type,
          'FINANCE_MANAGER'::role_type,
          'BRANCH_MANAGER'::role_type
        ])
    END
  );

-- ─── SHIFTS ─────────────────────────────────────────────────

CREATE POLICY "shifts_select"
  ON shifts FOR SELECT
  USING (can_access_branch(branch_id));

CREATE POLICY "shifts_insert"
  ON shifts FOR INSERT
  WITH CHECK (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'BRANCH_MANAGER'::role_type,
      'SHIFT_SUPERVISOR'::role_type
    ])
    AND can_access_branch(branch_id)
  );

CREATE POLICY "shifts_update"
  ON shifts FOR UPDATE
  USING (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'BRANCH_MANAGER'::role_type,
      'SHIFT_SUPERVISOR'::role_type
    ])
    AND can_access_branch(branch_id)
  );

-- ─── TASKS ──────────────────────────────────────────────────

CREATE POLICY "tasks_select"
  ON tasks FOR SELECT
  USING (can_access_branch(branch_id));

CREATE POLICY "tasks_insert"
  ON tasks FOR INSERT
  WITH CHECK (
    can_access_branch(branch_id)
    AND NOT has_role(ARRAY['AUDITOR'::role_type])  -- auditors read-only
  );

CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE
  USING (
    can_access_branch(branch_id)
    AND (
      assignee_id = auth_user_id()
      OR creator_id = auth_user_id()
      OR has_role(ARRAY[
        'ADMIN'::role_type,
        'BRANCH_MANAGER'::role_type,
        'SHIFT_SUPERVISOR'::role_type
      ])
    )
  );

-- ─── INCIDENTS ──────────────────────────────────────────────

CREATE POLICY "incidents_select"
  ON incidents FOR SELECT
  USING (can_access_branch(branch_id));

CREATE POLICY "incidents_insert"
  ON incidents FOR INSERT
  WITH CHECK (
    can_access_branch(branch_id)
    AND NOT has_role(ARRAY['AUDITOR'::role_type, 'FINANCE_STAFF'::role_type])
  );

CREATE POLICY "incidents_update"
  ON incidents FOR UPDATE
  USING (
    can_access_branch(branch_id)
    AND has_role(ARRAY[
      'ADMIN'::role_type,
      'BRANCH_MANAGER'::role_type,
      'SHIFT_SUPERVISOR'::role_type,
      'DAMAGE_CLAIMS_STAFF'::role_type,
      'FLEET_COORDINATOR'::role_type
    ])
  );

-- ─── INCIDENT EVIDENCE ─────────────────────────────────────

CREATE POLICY "evidence_select"
  ON incident_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE id = incident_id AND can_access_branch(branch_id)
    )
  );

CREATE POLICY "evidence_insert"
  ON incident_evidence FOR INSERT
  WITH CHECK (
    NOT has_role(ARRAY['AUDITOR'::role_type])
  );

-- Immutable evidence cannot be deleted
CREATE POLICY "evidence_delete"
  ON incident_evidence FOR DELETE
  USING (
    is_immutable = false
    AND has_role(ARRAY['ADMIN'::role_type, 'BRANCH_MANAGER'::role_type])
  );

-- ─── INSPECTIONS ────────────────────────────────────────────

CREATE POLICY "inspections_select"
  ON inspections FOR SELECT
  USING (can_access_branch(branch_id));

CREATE POLICY "inspections_insert"
  ON inspections FOR INSERT
  WITH CHECK (can_access_branch(branch_id));

CREATE POLICY "inspections_update"
  ON inspections FOR UPDATE
  USING (
    can_access_branch(branch_id)
    AND (
      inspector_id = auth_user_id()
      OR has_role(ARRAY['ADMIN'::role_type, 'BRANCH_MANAGER'::role_type])
    )
  );

-- ─── INSPECTION ITEMS ───────────────────────────────────────

CREATE POLICY "inspection_items_select"
  ON inspection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE id = inspection_id AND can_access_branch(branch_id)
    )
  );

CREATE POLICY "inspection_items_insert"
  ON inspection_items FOR INSERT
  WITH CHECK (true);  -- controlled by inspection access

CREATE POLICY "inspection_items_update"
  ON inspection_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE id = inspection_id
        AND can_access_branch(branch_id)
        AND status != 'COMPLETED'
    )
  );

-- ─── MAINTENANCE REQUESTS ───────────────────────────────────

CREATE POLICY "maintenance_select"
  ON maintenance_requests FOR SELECT
  USING (can_access_branch(branch_id));

CREATE POLICY "maintenance_insert"
  ON maintenance_requests FOR INSERT
  WITH CHECK (
    can_access_branch(branch_id)
    AND has_role(ARRAY[
      'ADMIN'::role_type,
      'FLEET_COORDINATOR'::role_type,
      'BRANCH_MANAGER'::role_type,
      'SHIFT_SUPERVISOR'::role_type
    ])
  );

CREATE POLICY "maintenance_update"
  ON maintenance_requests FOR UPDATE
  USING (
    can_access_branch(branch_id)
    AND has_role(ARRAY[
      'ADMIN'::role_type,
      'FLEET_COORDINATOR'::role_type,
      'BRANCH_MANAGER'::role_type
    ])
  );

-- ─── MAINTENANCE PARTS ─────────────────────────────────────

CREATE POLICY "maint_parts_select"
  ON maintenance_parts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_requests
      WHERE id = maintenance_request_id AND can_access_branch(branch_id)
    )
  );

CREATE POLICY "maint_parts_modify"
  ON maintenance_parts FOR ALL
  USING (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'FLEET_COORDINATOR'::role_type,
      'BRANCH_MANAGER'::role_type
    ])
  );

-- ─── CLAIMS ─────────────────────────────────────────────────

CREATE POLICY "claims_select"
  ON claims FOR SELECT
  USING (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'DAMAGE_CLAIMS_STAFF'::role_type,
      'FINANCE_MANAGER'::role_type,
      'OPERATIONS_DIRECTOR'::role_type,
      'AUDITOR'::role_type,
      'BRANCH_MANAGER'::role_type
    ])
  );

CREATE POLICY "claims_insert"
  ON claims FOR INSERT
  WITH CHECK (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'DAMAGE_CLAIMS_STAFF'::role_type,
      'BRANCH_MANAGER'::role_type
    ])
  );

CREATE POLICY "claims_update"
  ON claims FOR UPDATE
  USING (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'DAMAGE_CLAIMS_STAFF'::role_type,
      'FINANCE_MANAGER'::role_type
    ])
  );

-- ─── CLAIM DOCUMENTS ───────────────────────────────────────

CREATE POLICY "claim_docs_select"
  ON claim_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM claims WHERE id = claim_id
    )
  );

CREATE POLICY "claim_docs_insert"
  ON claim_documents FOR INSERT
  WITH CHECK (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'DAMAGE_CLAIMS_STAFF'::role_type
    ])
  );

-- ─── APPROVAL REQUESTS ─────────────────────────────────────

CREATE POLICY "approvals_select"
  ON approval_requests FOR SELECT
  USING (
    requester_id = auth_user_id()
    OR approver_id = auth_user_id()
    OR has_role(ARRAY[
      'ADMIN'::role_type,
      'OPERATIONS_DIRECTOR'::role_type,
      'BRANCH_MANAGER'::role_type
    ])
  );

CREATE POLICY "approvals_insert"
  ON approval_requests FOR INSERT
  WITH CHECK (requester_id = auth_user_id());

CREATE POLICY "approvals_update"
  ON approval_requests FOR UPDATE
  USING (
    -- Only approver or escalation targets can update
    approver_id = auth_user_id()
    OR has_role(ARRAY['ADMIN'::role_type, 'OPERATIONS_DIRECTOR'::role_type])
  );

-- ─── CHAT CHANNELS ─────────────────────────────────────────

CREATE POLICY "channels_select"
  ON chat_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE channel_id = chat_channels.id AND user_id = auth_user_id()
    )
    OR (type = 'BRANCH' AND can_access_branch(branch_id))
    OR has_role(ARRAY['ADMIN'::role_type])
  );

CREATE POLICY "channels_insert"
  ON chat_channels FOR INSERT
  WITH CHECK (
    NOT has_role(ARRAY['AUDITOR'::role_type])
  );

-- ─── CHAT PARTICIPANTS ─────────────────────────────────────

CREATE POLICY "participants_select"
  ON chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.channel_id = chat_participants.channel_id
        AND cp.user_id = auth_user_id()
    )
    OR has_role(ARRAY['ADMIN'::role_type])
  );

CREATE POLICY "participants_insert"
  ON chat_participants FOR INSERT
  WITH CHECK (true);  -- controlled by channel creation logic

CREATE POLICY "participants_update"
  ON chat_participants FOR UPDATE
  USING (user_id = auth_user_id());

-- ─── CHAT MESSAGES ──────────────────────────────────────────

CREATE POLICY "chat_messages_select"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE channel_id = chat_messages.channel_id
        AND user_id = auth_user_id()
    )
    OR has_role(ARRAY['ADMIN'::role_type])
  );

CREATE POLICY "chat_messages_insert"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth_user_id()
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE channel_id = chat_messages.channel_id
        AND user_id = auth_user_id()
    )
  );

CREATE POLICY "chat_messages_update"
  ON chat_messages FOR UPDATE
  USING (
    sender_id = auth_user_id()
    AND edited_at IS NULL  -- can only edit once
  );

-- ─── NOTIFICATIONS ──────────────────────────────────────────

CREATE POLICY "notifications_select"
  ON notifications FOR SELECT
  USING (user_id = auth_user_id());

CREATE POLICY "notifications_update"
  ON notifications FOR UPDATE
  USING (user_id = auth_user_id());  -- only mark own as read

-- ─── AUDIT LOGS ─────────────────────────────────────────────
-- Read-only for authorized roles. Never deletable.

CREATE POLICY "audit_select"
  ON audit_logs FOR SELECT
  USING (
    has_role(ARRAY[
      'ADMIN'::role_type,
      'AUDITOR'::role_type,
      'OPERATIONS_DIRECTOR'::role_type
    ])
    OR (
      -- Branch managers can see their branch audit logs
      has_role(ARRAY['BRANCH_MANAGER'::role_type])
      AND can_access_branch(branch_id)
    )
  );

-- Insert only via service role (SECURITY DEFINER functions)
-- No direct insert policy for regular users

-- ─── CONVERSATIONS & MESSAGES (AI Workspace) ───────────────

CREATE POLICY "conversations_select"
  ON conversations FOR SELECT
  USING (user_id = auth_user_id());

CREATE POLICY "conversations_insert"
  ON conversations FOR INSERT
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "conversations_update"
  ON conversations FOR UPDATE
  USING (user_id = auth_user_id());

CREATE POLICY "conversations_delete"
  ON conversations FOR DELETE
  USING (user_id = auth_user_id());

CREATE POLICY "ai_messages_select"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id AND user_id = auth_user_id()
    )
  );

CREATE POLICY "ai_messages_insert"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id AND user_id = auth_user_id()
    )
  );

-- ─── SHORTCUTS ──────────────────────────────────────────────

CREATE POLICY "shortcuts_select"
  ON shortcuts FOR SELECT
  USING (
    created_by_id = auth_user_id()
    OR visibility_scope = 'public'
    OR has_role(ARRAY['ADMIN'::role_type])
  );

CREATE POLICY "shortcuts_insert"
  ON shortcuts FOR INSERT
  WITH CHECK (created_by_id = auth_user_id());

CREATE POLICY "shortcuts_update"
  ON shortcuts FOR UPDATE
  USING (
    created_by_id = auth_user_id()
    OR has_role(ARRAY['ADMIN'::role_type])
  );

-- ─── SERVICE ROLE BYPASS ────────────────────────────────────
-- The service_role key bypasses RLS. Used only by:
-- 1. Server-side tRPC procedures (via Supabase service client)
-- 2. Audit log inserts
-- 3. System-generated tasks/notifications
-- NEVER expose service_role key to the frontend.
