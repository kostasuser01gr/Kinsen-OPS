import { PrismaClient, Role, VehicleStatus, VehicleClass, RentalStatus, TaskPriority, TaskStatus, IncidentSeverity, IncidentStatus, PaymentMethod, PaymentType, PaymentStatus, ChannelType, ShiftStatus, MaintenanceType, MaintenancePriority, MaintenanceStatus, InspectionType, ClaimType, ResponsibleParty, ApprovalType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.claimDocument.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.maintenancePart.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.inspectionItem.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.shortcut.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.incidentEvidence.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.vehicleStatusHistory.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  // ─── Branches ───
  const branch1 = await prisma.branch.create({
    data: { name: "Athens Airport", code: "ATH-APT", address: "Athens International Airport", phone: "+30-210-1234567", timezone: "Europe/Athens" },
  });
  const branch2 = await prisma.branch.create({
    data: { name: "Athens Downtown", code: "ATH-CTR", address: "Syntagma Square, Athens", phone: "+30-210-7654321", timezone: "Europe/Athens" },
  });
  const branch3 = await prisma.branch.create({
    data: { name: "Thessaloniki Airport", code: "SKG-APT", address: "Thessaloniki Airport", phone: "+30-231-1234567", timezone: "Europe/Athens" },
  });

  // ─── Users (PIN: 4-digit, hashed with bcrypt) ───
  const pinHash = await bcrypt.hash("1234", 12);

  const admin = await prisma.user.create({
    data: { identifier: "admin", name: "System Admin", pinHash, email: "admin@kinsen.com", role: Role.ADMIN, branchId: branch1.id },
  });
  const manager1 = await prisma.user.create({
    data: { identifier: "maria.p", name: "Maria Papadopoulou", pinHash, email: "maria@kinsen.com", role: Role.BRANCH_MANAGER, branchId: branch1.id },
  });
  const agent1 = await prisma.user.create({
    data: { identifier: "nikos.g", name: "Nikos Georgiou", pinHash, email: "nikos@kinsen.com", role: Role.BRANCH_AGENT, branchId: branch1.id },
  });
  const agent2 = await prisma.user.create({
    data: { identifier: "elena.d", name: "Elena Dimitriou", pinHash, email: "elena@kinsen.com", role: Role.BRANCH_AGENT, branchId: branch2.id },
  });
  const fleetCoord = await prisma.user.create({
    data: { identifier: "kostas.n", name: "Kostas Nikolaou", pinHash, email: "kostas@kinsen.com", role: Role.FLEET_COORDINATOR, branchId: branch1.id },
  });
  const financeStaff = await prisma.user.create({
    data: { identifier: "anna.k", name: "Anna Katsarou", pinHash, email: "anna@kinsen.com", role: Role.FINANCE_STAFF, branchId: branch1.id },
  });
  const supervisor = await prisma.user.create({
    data: { identifier: "dimitris.a", name: "Dimitris Alexiou", pinHash, email: "dimitris@kinsen.com", role: Role.SHIFT_SUPERVISOR, branchId: branch1.id },
  });
  const opsDir = await prisma.user.create({
    data: { identifier: "director", name: "Giorgos Papadakis", pinHash, email: "director@kinsen.com", role: Role.OPERATIONS_DIRECTOR },
  });

  // ─── Vehicles ───
  const vehicles = await Promise.all([
    prisma.vehicle.create({ data: { plate: "ΑΒΚ-1234", branchId: branch1.id, class: VehicleClass.ECONOMY, make: "Toyota", model: "Yaris", year: 2024, color: "White", status: VehicleStatus.AVAILABLE, readinessState: "READY", complianceStatus: "COMPLIANT", mileage: 12500, fuelLevel: 85, nextServiceDue: new Date("2026-06-15") } }),
    prisma.vehicle.create({ data: { plate: "ΑΒΚ-5678", branchId: branch1.id, class: VehicleClass.COMPACT, make: "Volkswagen", model: "Golf", year: 2023, color: "Silver", status: VehicleStatus.ON_RENT, readinessState: "READY", complianceStatus: "COMPLIANT", mileage: 28000, fuelLevel: 60, nextServiceDue: new Date("2026-04-01") } }),
    prisma.vehicle.create({ data: { plate: "ΑΒΚ-9012", branchId: branch1.id, class: VehicleClass.SUV, make: "Nissan", model: "Qashqai", year: 2024, color: "Black", status: VehicleStatus.AVAILABLE, readinessState: "READY", complianceStatus: "COMPLIANT", mileage: 8900, fuelLevel: 92 } }),
    prisma.vehicle.create({ data: { plate: "ΒΓΔ-3456", branchId: branch2.id, class: VehicleClass.MIDSIZE, make: "Hyundai", model: "Tucson", year: 2023, color: "Blue", status: VehicleStatus.MAINTENANCE_PENDING, readinessState: "BLOCKED", complianceStatus: "COMPLIANT", mileage: 45000, fuelLevel: 40, downtimeStart: new Date("2026-02-22T10:00:00Z"), downtimeReason: "Scheduled 45k service" } }),
    prisma.vehicle.create({ data: { plate: "ΒΓΔ-7890", branchId: branch2.id, class: VehicleClass.ECONOMY, make: "Fiat", model: "500", year: 2024, color: "Red", status: VehicleStatus.AVAILABLE, readinessState: "READY", complianceStatus: "COMPLIANT", mileage: 5200, fuelLevel: 75 } }),
    prisma.vehicle.create({ data: { plate: "ΕΖΗ-1111", branchId: branch1.id, class: VehicleClass.LUXURY, make: "BMW", model: "5 Series", year: 2024, color: "Black", status: VehicleStatus.PICKUP_READY, readinessState: "READY", complianceStatus: "COMPLIANT", mileage: 3200, fuelLevel: 100 } }),
    prisma.vehicle.create({ data: { plate: "ΕΖΗ-2222", branchId: branch3.id, class: VehicleClass.COMPACT, make: "Renault", model: "Clio", year: 2023, color: "White", status: VehicleStatus.AVAILABLE, readinessState: "READY", complianceStatus: "EXPIRING_SOON", mileage: 19000, fuelLevel: 65, nextInsuranceDue: new Date("2026-03-15") } }),
    prisma.vehicle.create({ data: { plate: "ΕΖΗ-3333", branchId: branch3.id, class: VehicleClass.VAN, make: "Mercedes", model: "Vito", year: 2022, color: "Gray", status: VehicleStatus.DAMAGE_HOLD, readinessState: "BLOCKED", complianceStatus: "COMPLIANT", mileage: 62000, fuelLevel: 30, downtimeStart: new Date("2026-02-22T16:00:00Z"), downtimeReason: "Rear bumper damage" } }),
    prisma.vehicle.create({ data: { plate: "ΘΙΚ-4444", branchId: branch1.id, class: VehicleClass.FULLSIZE, make: "Skoda", model: "Superb", year: 2024, color: "Silver", status: VehicleStatus.CLEANING_PENDING, readinessState: "NEEDS_CLEANING", complianceStatus: "COMPLIANT", mileage: 15600, fuelLevel: 55 } }),
    prisma.vehicle.create({ data: { plate: "ΘΙΚ-5555", branchId: branch2.id, class: VehicleClass.ECONOMY, make: "Citroen", model: "C3", year: 2023, color: "Orange", status: VehicleStatus.RETURN_PENDING_CHECKIN, readinessState: "NEEDS_INSPECTION", complianceStatus: "COMPLIANT", mileage: 31000, fuelLevel: 20 } }),
  ]);

  // ─── Customers ───
  const customers = await Promise.all([
    prisma.customer.create({ data: { firstName: "John", lastName: "Smith", email: "john.smith@email.com", phone: "+44-7700-123456", licenseNumber: "SMITH901234AB5CD" } }),
    prisma.customer.create({ data: { firstName: "Sarah", lastName: "Johnson", email: "sarah.j@email.com", phone: "+1-555-234-5678", licenseNumber: "S123-4567-8901" } }),
    prisma.customer.create({ data: { firstName: "Pierre", lastName: "Dupont", email: "pierre@email.fr", phone: "+33-6-1234-5678", licenseNumber: "FR-12345678" } }),
    prisma.customer.create({ data: { firstName: "Hans", lastName: "Mueller", email: "hans.m@email.de", phone: "+49-170-1234567", licenseNumber: "DE-MU-123456" } }),
    prisma.customer.create({ data: { firstName: "Yuki", lastName: "Tanaka", email: "yuki.t@email.jp", phone: "+81-90-1234-5678", licenseNumber: "JP-1234567890" } }),
  ]);

  // ─── Rentals ───
  const rental1 = await prisma.rental.create({
    data: {
      customerId: customers[0].id, vehicleId: vehicles[1].id, branchOutId: branch1.id,
      pickupTime: new Date("2026-02-20T10:00:00Z"), returnTime: new Date("2026-02-27T10:00:00Z"),
      status: RentalStatus.ACTIVE, paymentStatus: PaymentStatus.PAID, depositStatus: "HELD",
      dailyRate: 45.00, depositAmount: 300.00, totalAmount: 315.00,
    },
  });
  const rental2 = await prisma.rental.create({
    data: {
      customerId: customers[1].id, vehicleId: vehicles[5].id, branchOutId: branch1.id,
      pickupTime: new Date("2026-02-23T14:00:00Z"), returnTime: new Date("2026-02-28T14:00:00Z"),
      status: RentalStatus.CONFIRMED, paymentStatus: PaymentStatus.PENDING,
      dailyRate: 120.00, depositAmount: 500.00, totalAmount: 600.00,
    },
  });
  const rental3 = await prisma.rental.create({
    data: {
      customerId: customers[2].id, vehicleId: vehicles[9].id, branchOutId: branch2.id,
      pickupTime: new Date("2026-02-18T09:00:00Z"), returnTime: new Date("2026-02-23T09:00:00Z"),
      actualReturnTime: new Date("2026-02-23T11:30:00Z"),
      status: RentalStatus.ACTIVE, paymentStatus: PaymentStatus.PAID, depositStatus: "HELD",
      dailyRate: 35.00, depositAmount: 200.00, totalAmount: 175.00,
    },
  });

  // ─── Payments ───
  await Promise.all([
    prisma.payment.create({ data: { rentalId: rental1.id, amount: 315.00, method: PaymentMethod.CREDIT_CARD, status: PaymentStatus.PAID, type: PaymentType.RENTAL_CHARGE, paidAt: new Date("2026-02-20T10:15:00Z"), reconciliationState: "MATCHED" } }),
    prisma.payment.create({ data: { rentalId: rental1.id, amount: 300.00, method: PaymentMethod.CREDIT_CARD, status: PaymentStatus.PAID, type: PaymentType.DEPOSIT, paidAt: new Date("2026-02-20T10:15:00Z"), reconciliationState: "MATCHED" } }),
    prisma.payment.create({ data: { rentalId: rental3.id, amount: 175.00, method: PaymentMethod.CASH, status: PaymentStatus.PAID, type: PaymentType.RENTAL_CHARGE, paidAt: new Date("2026-02-18T09:20:00Z"), reconciliationState: "MATCHED" } }),
    prisma.payment.create({ data: { rentalId: rental3.id, amount: 200.00, method: PaymentMethod.CASH, status: PaymentStatus.PAID, type: PaymentType.DEPOSIT, paidAt: new Date("2026-02-18T09:20:00Z"), reconciliationState: "UNRECONCILED" } }),
  ]);

  // ─── Tasks ───
  await Promise.all([
    prisma.task.create({
      data: { type: "vehicle_prep", title: "Prepare BMW 5 Series for pickup", description: "Clean interior, full tank, check documents", linkedEntityType: "VEHICLE", linkedEntityId: vehicles[5].id, assigneeId: agent1.id, creatorId: manager1.id, priority: TaskPriority.HIGH, dueAt: new Date("2026-02-23T13:00:00Z"), branchId: branch1.id, status: TaskStatus.IN_PROGRESS },
    }),
    prisma.task.create({
      data: { type: "return_checkin", title: "Check in Citroen C3 return", description: "Vehicle returned late, inspect for damage", linkedEntityType: "VEHICLE", linkedEntityId: vehicles[9].id, assigneeId: agent2.id, creatorId: manager1.id, priority: TaskPriority.MEDIUM, dueAt: new Date("2026-02-23T14:00:00Z"), branchId: branch2.id, status: TaskStatus.PENDING },
    }),
    prisma.task.create({
      data: { type: "maintenance", title: "Schedule Hyundai Tucson service", description: "45,000 km service due", linkedEntityType: "VEHICLE", linkedEntityId: vehicles[3].id, assigneeId: fleetCoord.id, creatorId: fleetCoord.id, priority: TaskPriority.MEDIUM, branchId: branch2.id, status: TaskStatus.PENDING },
    }),
    prisma.task.create({
      data: { type: "damage_follow_up", title: "Mercedes Vito damage assessment", description: "Rear bumper damage reported, need repair quote", linkedEntityType: "VEHICLE", linkedEntityId: vehicles[7].id, creatorId: supervisor.id, priority: TaskPriority.URGENT, dueAt: new Date("2026-02-22T17:00:00Z"), branchId: branch3.id, status: TaskStatus.BLOCKED, handoverNotes: "Waiting for insurance assessor availability" },
    }),
    prisma.task.create({
      data: { type: "cleaning", title: "Deep clean Skoda Superb", linkedEntityType: "VEHICLE", linkedEntityId: vehicles[8].id, assigneeId: agent1.id, creatorId: supervisor.id, priority: TaskPriority.LOW, branchId: branch1.id, status: TaskStatus.PENDING },
    }),
  ]);

  // ─── Incidents ───
  const incident1 = await prisma.incident.create({
    data: {
      vehicleId: vehicles[7].id, branchId: branch3.id, severity: IncidentSeverity.MAJOR,
      description: "Rear bumper cracked and dented after parking incident. Customer admitted fault.",
      status: IncidentStatus.UNDER_REVIEW, financialImpactEstimate: 1200.00, reportedById: supervisor.id,
    },
  });
  await prisma.incident.create({
    data: {
      vehicleId: vehicles[9].id, branchId: branch2.id, severity: IncidentSeverity.MINOR,
      description: "Small scratch on driver door, noticed during return inspection.",
      status: IncidentStatus.REPORTED, financialImpactEstimate: 150.00, reportedById: agent2.id,
    },
  });

  // ─── Shifts ───
  await prisma.shift.create({
    data: {
      branchId: branch1.id, startTime: new Date("2026-02-23T06:00:00Z"), endTime: new Date("2026-02-23T14:00:00Z"),
      supervisorId: supervisor.id, status: ShiftStatus.ACTIVE,
    },
  });

  // ─── Chat Channels ───
  const generalChannel = await prisma.chatChannel.create({
    data: {
      name: "Athens Airport Team", type: ChannelType.BRANCH, branchId: branch1.id,
      participants: {
        create: [
          { userId: manager1.id },
          { userId: agent1.id },
          { userId: fleetCoord.id },
          { userId: supervisor.id },
        ],
      },
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      { channelId: generalChannel.id, senderId: manager1.id, content: "Good morning team! Busy day ahead with 3 pickups scheduled.", createdAt: new Date("2026-02-23T06:30:00Z") },
      { channelId: generalChannel.id, senderId: agent1.id, content: "BMW is almost ready for the 14:00 pickup. Just waiting on the full tank.", createdAt: new Date("2026-02-23T07:15:00Z") },
      { channelId: generalChannel.id, senderId: fleetCoord.id, content: "Heads up - the Tucson needs to go to service this week. Can we schedule it for Thursday?", createdAt: new Date("2026-02-23T08:00:00Z") },
      { channelId: generalChannel.id, senderId: supervisor.id, content: "The Vito damage assessment is still pending. Insurance assessor might come tomorrow.", createdAt: new Date("2026-02-23T09:30:00Z") },
    ],
  });

  // ─── Audit Logs ───
  await Promise.all([
    prisma.auditLog.create({
      data: { actorId: agent1.id, action: "vehicle.transition_status", entityType: "Vehicle", entityId: vehicles[5].id, previousState: { status: "AVAILABLE" }, newState: { status: "RESERVED_PREP_PENDING" }, branchId: branch1.id, createdAt: new Date("2026-02-22T15:00:00Z") },
    }),
    prisma.auditLog.create({
      data: { actorId: agent1.id, action: "vehicle.transition_status", entityType: "Vehicle", entityId: vehicles[5].id, previousState: { status: "RESERVED_PREP_PENDING" }, newState: { status: "PICKUP_READY" }, branchId: branch1.id, createdAt: new Date("2026-02-23T08:30:00Z") },
    }),
    prisma.auditLog.create({
      data: { actorId: supervisor.id, action: "incident.create", entityType: "Incident", entityId: incident1.id, newState: { severity: "MAJOR", vehicleId: vehicles[7].id }, branchId: branch3.id, createdAt: new Date("2026-02-22T16:00:00Z") },
    }),
  ]);

  // ─── Maintenance Requests ───
  await prisma.maintenanceRequest.create({
    data: {
      vehicleId: vehicles[3].id, branchId: branch2.id, requestedById: fleetCoord.id,
      type: MaintenanceType.SCHEDULED, priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.APPROVED, description: "45,000 km scheduled service — oil change, filters, brake check",
      estimatedCost: 350, estimatedDuration: 180,
      scheduledDate: new Date("2026-02-27T09:00:00Z"),
      approvedById: manager1.id, approvedAt: new Date("2026-02-22T14:00:00Z"),
    },
  });
  await prisma.maintenanceRequest.create({
    data: {
      vehicleId: vehicles[7].id, branchId: branch3.id, requestedById: supervisor.id,
      type: MaintenanceType.UNSCHEDULED, priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.REQUESTED, description: "Rear bumper repair needed — damage from parking incident",
      estimatedCost: 1200, estimatedDuration: 480,
      fleetImpact: "OUT_OF_SERVICE",
    },
  });

  // ─── Inspections ───
  const pickupInspection = await prisma.inspection.create({
    data: {
      rentalId: rental1.id, vehicleId: vehicles[1].id, type: InspectionType.PICKUP,
      inspectorId: agent1.id, branchId: branch1.id,
      status: "COMPLETED", fuelLevel: 85, mileage: 27500,
      overallCondition: "Good", completedAt: new Date("2026-02-20T10:30:00Z"),
    },
  });
  await prisma.inspectionItem.createMany({
    data: [
      { inspectionId: pickupInspection.id, category: "EXTERIOR", checkpointName: "Front bumper", condition: "OK" },
      { inspectionId: pickupInspection.id, category: "EXTERIOR", checkpointName: "Rear bumper", condition: "OK" },
      { inspectionId: pickupInspection.id, category: "EXTERIOR", checkpointName: "Driver side", condition: "OK" },
      { inspectionId: pickupInspection.id, category: "EXTERIOR", checkpointName: "Passenger side", condition: "MINOR_DAMAGE", notes: "Small scratch on rear door — pre-existing" },
      { inspectionId: pickupInspection.id, category: "INTERIOR", checkpointName: "Dashboard & controls", condition: "OK" },
      { inspectionId: pickupInspection.id, category: "INTERIOR", checkpointName: "Seats & upholstery", condition: "OK" },
      { inspectionId: pickupInspection.id, category: "MECHANICAL", checkpointName: "Lights", condition: "OK" },
      { inspectionId: pickupInspection.id, category: "DOCUMENTS", checkpointName: "Insurance card", condition: "OK" },
    ],
  });

  // ─── Approval Requests ───
  await prisma.approvalRequest.create({
    data: {
      type: ApprovalType.MAINTENANCE, requesterId: fleetCoord.id,
      status: "PENDING", entityType: "MaintenanceRequest", entityId: "pending",
      reason: "Mercedes Vito bumper repair — estimated cost €1,200 exceeds threshold",
      payload: { vehicleId: vehicles[7].id, estimatedCost: 1200, description: "Rear bumper repair" },
      expiresAt: new Date("2026-02-25T17:00:00Z"),
    },
  });

  // ─── Notifications ───
  await prisma.notification.createMany({
    data: [
      { userId: manager1.id, type: "TASK_ASSIGNED", title: "New urgent task", body: "Mercedes Vito damage assessment needs attention", entityType: "Task", entityId: "placeholder" },
      { userId: fleetCoord.id, type: "MAINTENANCE_UPDATE", title: "Tucson service approved", body: "Scheduled for Feb 27", entityType: "MaintenanceRequest", entityId: "placeholder" },
      { userId: agent1.id, type: "TASK_ASSIGNED", title: "BMW 5 Series pickup prep", body: "Pickup at 14:00 — vehicle needs full tank and final check" },
    ],
  });

  // ─── Shortcuts ───
  await prisma.shortcut.deleteMany();
  await Promise.all([
    prisma.shortcut.create({
      data: { name: "Fleet Status", description: "Show all vehicles", icon: "Car", actionType: "tool_action", toolName: "fleet.list", outputMode: "table", visibilityScope: "org", createdById: admin.id },
    }),
    prisma.shortcut.create({
      data: { name: "Fleet Summary", description: "Vehicle stats breakdown", icon: "BarChart3", actionType: "tool_action", toolName: "fleet.stats", outputMode: "widget", visibilityScope: "org", createdById: admin.id },
    }),
    prisma.shortcut.create({
      data: { name: "Urgent Tasks", description: "Show urgent/high priority tasks", icon: "AlertTriangle", actionType: "tool_action", toolName: "task.list", defaultInputs: { priority: "URGENT" }, outputMode: "table", visibilityScope: "org", createdById: admin.id },
    }),
    prisma.shortcut.create({
      data: { name: "Active Rentals", description: "Currently active rental contracts", icon: "FileText", actionType: "tool_action", toolName: "rentals.active", outputMode: "table", visibilityScope: "org", createdById: admin.id },
    }),
    prisma.shortcut.create({
      data: { name: "Open Incidents", description: "Unresolved incidents", icon: "AlertTriangle", actionType: "tool_action", toolName: "incident.list", outputMode: "table", visibilityScope: "org", createdById: admin.id },
    }),
    prisma.shortcut.create({
      data: { name: "Finance Overview", description: "Revenue and payment summary", icon: "DollarSign", actionType: "tool_action", toolName: "finance.summary", outputMode: "widget", visibilityScope: "org", createdById: admin.id },
    }),
  ]);

  console.log("✅ Seed completed successfully!");
  console.log("");
  console.log("Demo accounts (all use PIN: 1234):");
  console.log("  admin          - System Admin");
  console.log("  maria.p        - Branch Manager (Athens Airport)");
  console.log("  nikos.g        - Branch Agent (Athens Airport)");
  console.log("  elena.d        - Branch Agent (Athens Downtown)");
  console.log("  kostas.n       - Fleet Coordinator");
  console.log("  anna.k         - Finance Staff");
  console.log("  dimitris.a     - Shift Supervisor");
  console.log("  director       - Operations Director");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
