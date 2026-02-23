"use client";

import { trpc } from "@/lib/trpc";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, VEHICLE_STATUS_TRANSITIONS } from "@/lib/vehicle-status";
import { ArrowLeft, Clock, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const { data: vehicle, isLoading, refetch } = trpc.fleet.getById.useQuery({ id });
  const transitionMutation = trpc.fleet.transitionStatus.useMutation({
    onSuccess: () => {
      toast.success("Vehicle status updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  if (!vehicle) return <div className="flex items-center justify-center py-20 text-muted-foreground">Vehicle not found</div>;

  const allowedTransitions = VEHICLE_STATUS_TRANSITIONS[vehicle.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{vehicle.plate}</h1>
          <p className="text-sm text-muted-foreground">
            {vehicle.make} {vehicle.model} ({vehicle.year}) · {vehicle.branch.name}
          </p>
        </div>
        <Badge className={`ml-auto text-sm ${VEHICLE_STATUS_COLORS[vehicle.status]}`}>
          {VEHICLE_STATUS_LABELS[vehicle.status]}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Class:</span> {vehicle.class}</div>
              <div><span className="text-muted-foreground">Color:</span> {vehicle.color ?? "–"}</div>
              <div><span className="text-muted-foreground">VIN:</span> {vehicle.vin ?? "–"}</div>
              <div><span className="text-muted-foreground">Internal Code:</span> {vehicle.internalCode ?? "–"}</div>
              <div><span className="text-muted-foreground">Mileage:</span> {vehicle.mileage.toLocaleString()} km</div>
              <div><span className="text-muted-foreground">Fuel Level:</span> {vehicle.fuelLevel != null ? `${vehicle.fuelLevel}%` : "–"}</div>
            </div>
            {vehicle.notes && (
              <>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1">{vehicle.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status Transition */}
        <Card>
          <CardHeader>
            <CardTitle>Status Transition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current: <strong>{VEHICLE_STATUS_LABELS[vehicle.status]}</strong>
            </p>
            {allowedTransitions.length > 0 ? (
              <div className="flex gap-2">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select new status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTransitions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {VEHICLE_STATUS_LABELS[s] ?? s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!selectedStatus || transitionMutation.isPending}
                  onClick={() =>
                    transitionMutation.mutate({
                      vehicleId: vehicle.id,
                      toStatus: selectedStatus as any,
                    })
                  }
                >
                  {transitionMutation.isPending ? "Updating..." : "Apply"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No transitions available from current status</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicle.statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet</p>
          ) : (
            <div className="space-y-3">
              {vehicle.statusHistory.map((h) => (
                <div key={h.id} className="flex items-start gap-3 text-sm">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div>
                      <Badge variant="outline" className="mr-1">{VEHICLE_STATUS_LABELS[h.fromStatus]}</Badge>
                      →
                      <Badge variant="outline" className="ml-1">{VEHICLE_STATUS_LABELS[h.toStatus]}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <User className="h-3 w-3" />
                      {h.actor.name} · {new Date(h.createdAt).toLocaleString()}
                      {h.reason && <span>· {h.reason}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Rentals */}
      {vehicle.rentals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Rentals</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle.rentals.map((r) => (
              <div key={r.id} className="text-sm">
                Contract: {r.contractNumber} · Customer: {r.customer.firstName} {r.customer.lastName} · Status: {r.status}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Open Incidents */}
      {vehicle.incidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open Incidents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {vehicle.incidents.map((inc) => (
              <div key={inc.id} className="flex items-center gap-2 text-sm">
                <Badge variant={inc.severity === "CRITICAL" ? "destructive" : "secondary"}>
                  {inc.severity}
                </Badge>
                <span>{inc.description.slice(0, 80)}{inc.description.length > 80 ? "..." : ""}</span>
                <span className="text-muted-foreground">· {inc.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
