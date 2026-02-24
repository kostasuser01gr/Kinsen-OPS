"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS } from "@/lib/vehicle-status";
import { Plus, Search } from "lucide-react";
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRealtimeFleet } from "@/hooks/use-realtime";

export default function FleetPage() {
  useRealtimeFleet();
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    plate: "", make: "", model: "", year: new Date().getFullYear().toString(),
    class: "ECONOMY", color: "", mileage: "0", notes: "",
  });

  const { data, isLoading } = trpc.fleet.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    page,
    limit: 20,
  });

  const { data: statusSummary } = trpc.fleet.statusSummary.useQuery();
  const utils = trpc.useUtils();

  const createVehicle = trpc.fleet.create.useMutation({
    onSuccess: () => {
      toast.success("Vehicle added");
      setDialogOpen(false);
      setForm({ plate: "", make: "", model: "", year: new Date().getFullYear().toString(), class: "ECONOMY", color: "", mileage: "0", notes: "" });
      utils.fleet.list.invalidate();
      utils.fleet.statusSummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet Management</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} vehicles total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!session?.user?.branchId) return toast.error("No branch assigned");
              createVehicle.mutate({
                plate: form.plate.toUpperCase(),
                make: form.make,
                model: form.model,
                year: parseInt(form.year),
                class: form.class as any,
                color: form.color || undefined,
                mileage: parseInt(form.mileage) || 0,
                notes: form.notes || undefined,
                branchId: session.user.branchId,
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Plate *</Label>
                  <Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} required placeholder="ΑΒΓ-1234" className="uppercase" />
                </div>
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <Select value={form.class} onValueChange={(v) => setForm({ ...form, class: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ECONOMY">Economy</SelectItem>
                      <SelectItem value="COMPACT">Compact</SelectItem>
                      <SelectItem value="MIDSIZE">Midsize</SelectItem>
                      <SelectItem value="FULLSIZE">Full Size</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem>
                      <SelectItem value="LUXURY">Luxury</SelectItem>
                      <SelectItem value="VAN">Van</SelectItem>
                      <SelectItem value="CONVERTIBLE">Convertible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Make *</Label>
                  <Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required placeholder="Toyota" />
                </div>
                <div className="space-y-2">
                  <Label>Model *</Label>
                  <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required placeholder="Corolla" />
                </div>
                <div className="space-y-2">
                  <Label>Year *</Label>
                  <Input type="number" min="1990" max="2030" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="White" />
                </div>
                <div className="space-y-2">
                  <Label>Mileage (km)</Label>
                  <Input type="number" min="0" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createVehicle.isPending}>{createVehicle.isPending ? "Adding..." : "Add Vehicle"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {statusSummary?.map((s) => (
          <Card
            key={s.status}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setStatusFilter(s.status)}
          >
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">
                {VEHICLE_STATUS_LABELS[s.status] ?? s.status}
              </p>
              <p className="text-2xl font-bold">{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plate, make, model..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(VEHICLE_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vehicle table */}
      <Card>
        <CardContent className="p-0">
          <ResponsiveTableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No vehicles found
                  </TableCell>
                </TableRow>
              ) : (
                data?.vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-medium">{v.plate}</TableCell>
                    <TableCell>
                      {v.make} {v.model} ({v.year})
                    </TableCell>
                    <TableCell>{v.class}</TableCell>
                    <TableCell>{v.branch.code}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={VEHICLE_STATUS_COLORS[v.status] ?? ""}
                      >
                        {VEHICLE_STATUS_LABELS[v.status] ?? v.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{v.mileage.toLocaleString()} km</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/fleet/${v.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </ResponsiveTableWrapper>
        </CardContent>
      </Card>
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
