"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS } from "@/lib/vehicle-status";
import { Car, FileText, ListTodo, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRealtimeFleet, useRealtimeTasks, useRealtimeIncidents } from "@/hooks/use-realtime";

export default function DashboardPage() {
  useRealtimeFleet();
  useRealtimeTasks();
  useRealtimeIncidents();

  const { data: fleetSummary } = trpc.fleet.statusSummary.useQuery();
  const { data: tasks } = trpc.task.list.useQuery({ status: "PENDING" as any, limit: 5 });
  const { data: rentals } = trpc.rental.list.useQuery({ status: "ACTIVE" as any, limit: 5 });
  const { data: incidents } = trpc.incident.list.useQuery({ limit: 5 });

  const totalVehicles = fleetSummary?.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const available = fleetSummary?.find((s) => s.status === "AVAILABLE")?.count ?? 0;
  const onRent = fleetSummary?.find((s) => s.status === "ON_RENT")?.count ?? 0;
  const maintenance = fleetSummary?.filter((s) =>
    ["MAINTENANCE_PENDING", "DAMAGE_HOLD", "OUT_OF_SERVICE"].includes(s.status)
  ).reduce((sum, s) => sum + s.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time overview of fleet, tasks, and operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2"><Car className="h-5 w-5 text-green-700" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{available}<span className="text-sm font-normal text-muted-foreground">/{totalVehicles}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2"><FileText className="h-5 w-5 text-purple-700" /></div>
              <div>
                <p className="text-sm text-muted-foreground">On Rent</p>
                <p className="text-2xl font-bold">{onRent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2"><ListTodo className="h-5 w-5 text-yellow-700" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Tasks</p>
                <p className="text-2xl font-bold">{tasks?.total ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2"><AlertTriangle className="h-5 w-5 text-red-700" /></div>
              <div>
                <p className="text-sm text-muted-foreground">In Maintenance</p>
                <p className="text-2xl font-bold">{maintenance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild><Link href="/rentals?new=true">+ New Rental</Link></Button>
        <Button variant="outline" asChild><Link href="/tasks?new=true">+ New Task</Link></Button>
        <Button variant="outline" asChild><Link href="/incidents?new=true">+ Report Incident</Link></Button>
        <Button variant="outline" asChild><Link href="/fleet?new=true">+ Add Vehicle</Link></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fleet Status Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fleet Status</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link href="/fleet">View all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fleetSummary?.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={VEHICLE_STATUS_COLORS[s.status] ?? ""}>
                      {VEHICLE_STATUS_LABELS[s.status] ?? s.status}
                    </Badge>
                  </div>
                  <span className="font-mono font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pending Tasks</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link href="/tasks">View all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            {!tasks?.tasks?.length ? (
              <p className="text-sm text-muted-foreground">No pending tasks</p>
            ) : (
              <div className="space-y-3">
                {tasks.tasks.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.assignee?.name ?? "Unassigned"}
                        {t.dueAt && (
                          <> · <Clock className="inline h-3 w-3" /> {new Date(t.dueAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <Badge variant={t.priority === "URGENT" ? "destructive" : t.priority === "HIGH" ? "default" : "secondary"} className="shrink-0 text-xs">
                      {t.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Rentals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Rentals</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link href="/rentals">View all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            {!rentals?.rentals?.length ? (
              <p className="text-sm text-muted-foreground">No active rentals</p>
            ) : (
              <div className="space-y-3">
                {rentals.rentals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{r.customer.firstName} {r.customer.lastName}</p>
                      <p className="text-xs text-muted-foreground">{r.vehicle.plate} · {r.vehicle.make} {r.vehicle.model}</p>
                    </div>
                    <Badge variant="secondary">{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Incidents</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link href="/incidents">View all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            {!incidents?.incidents?.length ? (
              <p className="text-sm text-muted-foreground">No incidents</p>
            ) : (
              <div className="space-y-3">
                {incidents.incidents.map((inc) => (
                  <div key={inc.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{inc.description}</p>
                      <p className="text-xs text-muted-foreground">{inc.vehicle.plate} · {new Date(inc.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={inc.severity === "CRITICAL" ? "destructive" : inc.severity === "MAJOR" ? "default" : "secondary"} className="shrink-0 text-xs">
                      {inc.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
