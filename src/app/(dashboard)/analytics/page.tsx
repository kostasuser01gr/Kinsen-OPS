"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car, FileText, ListTodo, AlertTriangle, DollarSign, Clock, TrendingUp,
} from "lucide-react";

export default function AnalyticsPage() {
  const { data: fleet } = trpc.analytics.fleetOverview.useQuery();
  const { data: kpis } = trpc.analytics.operationsKPIs.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">Operational KPIs and fleet intelligence</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Car className="h-4 w-4" />
              <span className="text-xs">Fleet Size</span>
            </div>
            <p className="text-2xl font-bold">{fleet?.totalVehicles ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Utilization</span>
            </div>
            <p className="text-2xl font-bold">{fleet?.utilization ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Car className="h-4 w-4" />
              <span className="text-xs">Readiness</span>
            </div>
            <p className="text-2xl font-bold">{fleet?.readinessRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Active Rentals</span>
            </div>
            <p className="text-2xl font-bold">{kpis?.activeRentals ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ListTodo className="h-4 w-4" />
              <span className="text-xs">Open Tasks</span>
            </div>
            <p className="text-2xl font-bold">{kpis?.openTasks ?? 0}</p>
            {kpis?.overdueTasks ? (
              <p className="text-xs text-red-600">{kpis.overdueTasks} overdue</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Open Incidents</span>
            </div>
            <p className="text-2xl font-bold">{kpis?.openIncidents ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Status Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fleet by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fleet?.statusBreakdown.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span>{s.status.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-primary rounded-full"
                      style={{ width: `${Math.max(4, (s.count / (fleet.totalVehicles || 1)) * 200)}px` }}
                    />
                    <span className="font-medium w-8 text-right">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fleet by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fleet?.classBreakdown.map((c) => (
                <div key={c.class} className="flex items-center justify-between text-sm">
                  <span>{c.class}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${Math.max(4, (c.count / (fleet.totalVehicles || 1)) * 200)}px` }}
                    />
                    <span className="font-medium w-8 text-right">{c.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finance exceptions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <Clock className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pending Refunds</p>
              <p className="text-xl font-bold">{kpis?.pendingRefunds ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <DollarSign className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Overdue Payments</p>
              <p className="text-xl font-bold">{kpis?.overduePayments ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
