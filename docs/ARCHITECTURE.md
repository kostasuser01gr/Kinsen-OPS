# KINSEN OPS — System Architecture Document
## Deliverables 3–10

---

## 3. ENTITY RELATIONSHIP MAP

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        KINSEN OPS — ENTITY MAP                         │
└─────────────────────────────────────────────────────────────────────────┘

ORGANIZATIONAL CORE
━━━━━━━━━━━━━━━━━━━
  Branch ──┬── 1:N ── User (staff assigned to branch)
           ├── 1:N ── Vehicle (fleet assigned to branch)
           ├── 1:N ── Shift (shift scheduling per branch)
           ├── 1:N ── Task (work items scoped to branch)
           ├── 1:N ── Incident (events at branch)
           ├── 1:N ── ChatChannel (branch-level comms)
           └── 1:N ── AuditLog (branch-scoped audit trail)

FLEET LIFECYCLE
━━━━━━━━━━━━━━━
  Vehicle ──┬── 1:N ── VehicleStatusHistory (lifecycle audit)
            ├── 1:N ── Rental (vehicle rented out)
            ├── 1:N ── Incident (damage/events on vehicle)
            ├── 1:N ── Inspection (condition checks)
            └── 1:N ── MaintenanceRequest (service records)

  Vehicle Status Machine:
  ┌──────────┐    ┌──────────────────┐    ┌─────────────┐
  │AVAILABLE │───▸│RESERVED_PREP_PEND│───▸│PICKUP_READY │
  └──────────┘    └──────────────────┘    └──────┬──────┘
       ▲                                         │
       │                                         ▼
  ┌────┴─────┐    ┌──────────────────┐    ┌──────────┐
  │CLEANING_ │◂───│INSPECTION_IN_PROG│◂───│ ON_RENT  │
  │PENDING   │    └───────┬──────────┘    └──────────┘
  └──────────┘            │                    │
                     ┌────┴────┐          (via RETURN_
                     ▼         ▼           PENDING_CHECKIN)
              ┌──────────┐ ┌────────────┐
              │DAMAGE_   │ │MAINTENANCE_│
              │HOLD      │ │PENDING     │
              └──────────┘ └────────────┘
                     │         │
                     ▼         ▼
              ┌──────────────────┐
              │  OUT_OF_SERVICE  │
              └──────────────────┘

RENTAL WORKFLOW
━━━━━━━━━━━━━━━
  Customer ── 1:N ── Rental ──┬── 1:N ── Payment
                              ├── 1:N ── Inspection
                              └── 1:N ── Claim

  Rental: DRAFT → CONFIRMED → ACTIVE → COMPLETED
                                      → CANCELLED / NO_SHOW

OPERATIONS
━━━━━━━━━━
  Task ──── M:1 ── User (assignee)
       ──── M:1 ── User (creator)
       ──── M:1 ── Branch
       ──── M:1 ── Shift (optional)
       ──── Polymorphic ── Vehicle|Rental|Incident|Payment|Branch|Shift

  Shift ── M:1 ── Branch
       ── M:1 ── User (supervisor)
       ── 1:N ── Task (tasks created during shift)

INCIDENT & CLAIMS
━━━━━━━━━━━━━━━━━
  Incident ──┬── 1:N ── IncidentEvidence
             └── 1:N ── Claim ── 1:N ── ClaimDocument

APPROVAL ENGINE
━━━━━━━━━━━━━━━
  ApprovalRequest ── M:1 ── User (requester)
                  ── M:1 ── User (approver)
                  ── Polymorphic ── any entity

COMMUNICATION
━━━━━━━━━━━━━
  ChatChannel ──┬── N:M ── User (via ChatParticipant)
                └── 1:N ── ChatMessage ── M:1 ── User (sender)

  ChatMessage can link to any entity (polymorphic)
  ChatMessage can convert to Task (converted_to_task_id)

AUDIT
━━━━━
  AuditLog ── M:1 ── User (actor)
          ── M:1 ── Branch (optional)
          ── Polymorphic ── any entity (entity_type + entity_id)
          ── Stores: previous_state + new_state as JSONB
```

---

## 4. BACKEND API ENDPOINT MAP

All endpoints served via tRPC routers on Next.js API routes.
Edge-compatible via `@cloudflare/next-on-pages`.

```
ROUTER          PROCEDURE                  AUTH ROLES                           DESCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

auth
  .login                                   public                               PIN-based login
  .signup                                  ADMIN                                Create user account
  .me                                      authenticated                        Current user profile
  .changePin                               authenticated                        Change own PIN

branch
  .list                                    authenticated                        List branches
  .getById                                 authenticated                        Branch details
  .create                                  ADMIN                                Create branch
  .update                                  ADMIN                                Update branch

fleet
  .list                                    branch-scoped                        Vehicles with filters
  .getById                                 branch-scoped                        Vehicle detail + history
  .statusSummary                           branch-scoped                        Status counts
  .create                                  ADMIN,FLEET_COORD,BR_MGR             Add vehicle
  .update                                  ops roles                            Update vehicle fields
  .transitionStatus                        ops roles (validated)                 Status lifecycle change
  .transferRequest                         BR_MGR+                              Initiate transfer

rental
  .list                                    branch-scoped                        Rentals with filters
  .getById                                 branch-scoped                        Rental detail
  .create                                  BR_AGENT,SHIFT_SUP,BR_MGR            New rental
  .update                                  BR_AGENT,SHIFT_SUP,BR_MGR            Modify rental
  .updateStatus                            ops roles                            Status transition
  .calculateCharges                        ops roles                            Preview pricing

task
  .list                                    branch-scoped                        Tasks with filters
  .getById                                 branch-scoped                        Task detail
  .create                                  all except AUDITOR                   Create task
  .update                                  assignee/creator/mgr                 Update task
  .updateStatus                            assignee/creator/mgr                 Status transition
  .overdue                                 branch-scoped                        Overdue tasks list
  .escalate                                SHIFT_SUP,BR_MGR,ADMIN               Escalate task

shift
  .list                                    branch-scoped                        Shifts with filters
  .getById                                 branch-scoped                        Shift detail
  .create                                  BR_MGR,SHIFT_SUP,ADMIN               Schedule shift
  .update                                  BR_MGR,SHIFT_SUP,ADMIN               Update shift
  .startShift                              SHIFT_SUP                            Begin shift
  .endShift                                SHIFT_SUP                            End + handover
  .handoverSummary                         branch-scoped                        Auto-generated summary

incident
  .list                                    branch-scoped                        Incidents with filters
  .getById                                 branch-scoped                        Incident detail
  .create                                  ops roles                            Report incident
  .update                                  mgr/claims/fleet                     Update incident
  .addEvidence                             ops roles                            Upload evidence

inspection
  .list                                    branch-scoped                        Inspections list
  .getById                                 branch-scoped                        Inspection detail
  .create                                  ops roles                            Start inspection
  .addItem                                 inspector                            Add checkpoint
  .complete                                inspector/mgr                        Complete inspection

maintenance
  .list                                    branch-scoped                        Maintenance list
  .getById                                 branch-scoped                        Request detail
  .create                                  FLEET_COORD,BR_MGR,SHIFT_SUP         Create request
  .update                                  FLEET_COORD,BR_MGR                   Update request
  .approve                                 BR_MGR,FLEET_COORD                   Approve request

finance
  .payments.list                           finance roles + mgr                  Payments list
  .payments.create                         finance + mgr + agent                Record payment
  .payments.update                         finance + mgr                        Update payment
  .reconciliation.list                     FINANCE_MGR,ADMIN                    Reconciliation queue
  .reconciliation.match                    FINANCE_MGR,ADMIN                    Mark as matched
  .dailySummary                            FINANCE_MGR,BR_MGR,ADMIN             Daily financial summary

claim
  .list                                    claims/finance/mgr                   Claims list
  .getById                                 claims/finance/mgr                   Claim detail
  .create                                  CLAIMS_STAFF,BR_MGR                  File claim
  .update                                  CLAIMS_STAFF,FINANCE_MGR             Update claim
  .addDocument                             CLAIMS_STAFF                         Attach document

approval
  .list                                    requester/approver/mgr               Pending approvals
  .request                                 authenticated                        Submit request
  .decide                                  approver/mgr/admin                   Approve/deny

chat
  .channels.list                           participant/branch                   User's channels
  .channels.create                         all except AUDITOR                   Create channel
  .channels.addMember                      channel member                       Add participant
  .messages.list                           participant                          Channel messages
  .messages.send                           participant                          Send message
  .messages.edit                           sender (once)                        Edit message
  .messages.convertToTask                  SHIFT_SUP,BR_MGR,ADMIN               Message → Task
  .unreadCounts                            authenticated                        Unread per channel

notification
  .list                                    own only                             User notifications
  .markRead                                own only                             Mark as read
  .markAllRead                             own only                             Mark all read

analytics
  .fleetOverview                           BR_MGR,OPS_DIR,ADMIN                 Fleet KPIs
  .operationsKPIs                          BR_MGR,OPS_DIR,ADMIN                 Ops metrics
  .branchComparison                        OPS_DIR,ADMIN                        Cross-branch
  .financeSummary                          FINANCE_MGR,OPS_DIR,ADMIN            Revenue metrics
  .taskPerformance                         BR_MGR+                              Task completion rates

audit
  .list                                    ADMIN,AUDITOR,OPS_DIR                Audit log query
  .getByEntity                             ADMIN,AUDITOR,OPS_DIR,BR_MGR         Entity audit trail

workspace (AI)
  .conversations.list                      own only                             AI conversations
  .conversations.create                    own only                             New conversation
  .conversations.delete                    own only                             Delete conversation
  .chat                                    authenticated                        AI chat (OpenRouter)
```

---

## 5. MIDDLEWARE ARCHITECTURE

```
REQUEST FLOW
━━━━━━━━━━━━

  ┌────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐     ┌─────────┐
  │ Client │────▸│ Next.js  │────▸│   Auth    │────▸│  Role    │────▸│ Input   │
  │        │     │Middleware│     │  Guard    │     │  Guard   │     │Validate │
  └────────┘     └──────────┘     └───────────┘     └──────────┘     └────┬────┘
                                                                         │
  ┌────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐         │
  │Response│◂────│  Audit   │◂────│ Business  │◂────│Lifecycle │◂────────┘
  │        │     │  Logger  │     │  Logic    │     │Validator │
  └────────┘     └──────────┘     └───────────┘     └──────────┘
```

### Layer 1: Next.js Middleware (`src/middleware.ts`)
- Route protection: redirect unauthenticated to `/login`
- Public routes whitelist: `/login`, `/signup`, `/api/auth/*`, `/api/health`
- Session token validation via Supabase

### Layer 2: tRPC Auth Guard (`src/server/trpc.ts`)
```typescript
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});
```

### Layer 3: Role Guard (per-router)
```typescript
export const requireRole = (roles: Role[]) =>
  t.middleware(({ ctx, next }) => {
    if (!roles.includes(ctx.user.role))
      throw new TRPCError({ code: 'FORBIDDEN' });
    return next({ ctx });
  });

export const requireBranch = () =>
  t.middleware(({ ctx, next }) => {
    // Global roles bypass; others must match branch_id
    return next({ ctx });
  });
```

### Layer 4: Input Validation (Zod)
Every procedure uses strict Zod schemas. No raw input passes through.

### Layer 5: Lifecycle Validator
Validates state transitions against `valid_vehicle_transitions` table.
Called before any status change mutation.

### Layer 6: Audit Logger
Wraps every mutation — captures actor, action, entity, before/after state.

### Error Standard
```typescript
{
  code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND',
  message: string,
  details?: { field?, constraint?, currentState?, allowedTransitions? }
}
```

---

## 6. FRONTEND ROUTE STRUCTURE

```
ROUTE                    LAYOUT         AUTH    ROLE FILTER         PAGE RESPONSIBILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/login                   (auth)         public  —                   PIN login form
/signup                  (auth)         ADMIN   ADMIN               Create user

/                        (dashboard)    auth    all                 → /dashboard
/dashboard               (dashboard)    auth    all                 KPIs, alerts, quick actions
/fleet                   (dashboard)    auth    ops+                Vehicle list, status cards
/fleet/[id]              (dashboard)    auth    ops+                Vehicle detail + actions
/rentals                 (dashboard)    auth    ops+                Rental list
/rentals/[id]            (dashboard)    auth    ops+                Rental detail + payments
/tasks                   (dashboard)    auth    all                 Task board, overdue
/tasks/[id]              (dashboard)    auth    assignee/mgr        Task detail + checklist
/shifts                  (dashboard)    auth    SUP,MGR,ADMIN       Shift schedule + handover
/incidents               (dashboard)    auth    ops+                Incident list
/incidents/[id]          (dashboard)    auth    ops+                Incident detail + evidence
/finance                 (dashboard)    auth    finance+mgr         Payments, reconciliation
/analytics               (dashboard)    auth    MGR,DIR,ADMIN       Charts, branch comparison
/chat                    (dashboard)    auth    all-AUDITOR         Channels, messages
/audit                   (dashboard)    auth    ADMIN,AUDITOR,DIR   Audit log viewer
/admin                   (dashboard)    auth    ADMIN               System config
/workspace               workspace     auth    all                 AI assistant
```

### Layout Structure
```
(dashboard) layout:
  ├── Sidebar (collapsible, role-filtered nav)
  ├── Header (breadcrumb, notifications, search)
  └── Main content area (scrollable)
```

### High-Frequency Action Optimization
- Dashboard: 1-click quick actions (New Rental, Return Vehicle, Report Incident)
- Fleet: Status badge = dropdown for instant transition
- Tasks: Kanban drag or status-click to transition
- Overdue items: Red highlight with elapsed time counter

---

## 7. STATE MANAGEMENT DESIGN

```
LAYER           TECHNOLOGY                  PURPOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server State    TanStack Query (via tRPC)   All API data, cache, optimistic updates
Realtime        Supabase Realtime           Cache invalidation, live chat, alerts
Client State    React useState/useReducer   UI: filters, modals, selections
Form State      react-hook-form + Zod       Validated forms
Session         Supabase Auth (JWT cookie)  User ID, role, branch_id
URL State       Next.js searchParams        Shareable filters, pagination
```

### Query Key Convention
```typescript
['fleet', 'list', filters]    // list queries
['fleet', 'detail', id]       // detail queries
['fleet', 'summary', branch]  // aggregates
```

### Optimistic Updates
All status transitions use optimistic UI → rollback on error → invalidate on settle.

---

## 8. REALTIME INTEGRATION

```
CHANNEL                TABLE             EVENTS     ACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
vehicle-status         vehicles          UPDATE     Invalidate fleet queries + toast
task-updates           tasks             INS/UPD    Invalidate task list + toast
chat:{channelId}       chat_messages     INSERT     Append to message cache
notifications:{uid}    notifications     INSERT     Increment badge + toast
shift-updates          shifts            UPDATE     Invalidate shift queries
```

### Implementation
- Custom hooks: `useRealtimeFleet()`, `useRealtimeChat()`, `useRealtimeTasks()`
- Each subscribes to `postgres_changes` on relevant table
- On change → invalidate React Query cache → UI auto-updates
- Dashboard: polling every 30s + realtime for urgent changes

---

## 9. MVP BUILD ROADMAP

```
PHASE   NAME                    DELIVERABLES                                    DEPENDS ON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1     Foundation              Schema, Auth, RLS, Supabase client, seed data   —
  2     Fleet Core              Fleet CRUD, lifecycle engine, UI, realtime      1
  3     Rentals + Customers     Customer CRUD, rental wizard, inspections       2
  4     Tasks + Shifts          Task board, SLA, escalation, handover           2
  5     Communication+Finance   Chat (realtime), payments, reconciliation       3, 4
  6     Incidents + Claims      Incident UI, evidence upload, claims, approvals 3
  7     Dashboard + Analytics   KPI cards, charts, branch comparison            5, 6
  8     AI + Deployment         OpenRouter workspace, Cloudflare deploy, CI/CD  7
```

---

## 10. SCALABILITY EXPANSION PLAN

### Near-Term
- Multi-tenancy (tenant_id + RLS)
- Mobile PWA (responsive + service worker)
- Document generation (contracts, invoices via Worker)
- Email notifications (Supabase Edge Functions)

### Data Growth
- Free tier: 500MB DB, sufficient for ~50 vehicles / 5 branches / 1 year
- Growth: Supabase Pro at >500MB ($25/mo)
- Scale: Materialized views, pg_cron, read replicas

### Security Hardening
- MFA (TOTP via Supabase)
- IP allowlisting
- Session timeout
- PII masking in audit logs
- GDPR data deletion workflows

### Performance
- Database indexes (done)
- React Query caching (5-30s stale times)
- Edge caching for analytics
- Virtual scrolling for large lists
- Database partitioning for audit_logs
