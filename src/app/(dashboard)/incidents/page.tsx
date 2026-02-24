"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRealtimeIncidents } from "@/hooks/use-realtime";

const SEVERITY_COLORS: Record<string, string> = {
  MINOR: "bg-yellow-100 text-yellow-700",
  MODERATE: "bg-orange-100 text-orange-700",
  MAJOR: "bg-red-100 text-red-700",
  CRITICAL: "bg-red-200 text-red-900",
};

export default function IncidentsPage() {
  useRealtimeIncidents();
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", severity: "MINOR", description: "", estimate: "" });

  const { data, isLoading } = trpc.incident.list.useQuery({ page, limit: 20 });
  const { data: vehicles } = trpc.fleet.list.useQuery({ limit: 100 });
  const utils = trpc.useUtils();

  const createIncident = trpc.incident.create.useMutation({
    onSuccess: () => {
      toast.success("Incident reported");
      setDialogOpen(false);
      setForm({ vehicleId: "", severity: "MINOR", description: "", estimate: "" });
      utils.incident.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incidents & Damage</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} incidents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Report Incident</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!session?.user?.branchId) return toast.error("No branch assigned");
              createIncident.mutate({
                vehicleId: form.vehicleId,
                branchId: session.user.branchId,
                severity: form.severity as any,
                description: form.description,
                financialImpactEstimate: form.estimate ? parseFloat(form.estimate) : undefined,
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle *</Label>
                <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles?.vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.plate} — {v.make} {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Severity *</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MINOR">Minor</SelectItem>
                      <SelectItem value="MODERATE">Moderate</SelectItem>
                      <SelectItem value="MAJOR">Major</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Est. Cost (€)</Label>
                  <Input type="number" min="0" step="0.01" value={form.estimate} onChange={(e) => setForm({ ...form, estimate: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} required placeholder="Describe the incident..." />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createIncident.isPending || !form.vehicleId}>
                  {createIncident.isPending ? "Reporting..." : "Report Incident"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <ResponsiveTableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : data?.incidents.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No incidents found</TableCell></TableRow>
              ) : (
                data?.incidents.map((inc) => (
                  <TableRow key={inc.id}>
                    <TableCell><Badge variant="secondary" className={SEVERITY_COLORS[inc.severity]}>{inc.severity}</Badge></TableCell>
                    <TableCell className="font-mono">{inc.vehicle.plate}</TableCell>
                    <TableCell>{inc.branch.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{inc.description}</TableCell>
                    <TableCell><Badge variant="outline">{inc.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{inc.claimsStatus.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-sm">{inc.reportedBy.name}</TableCell>
                    <TableCell className="text-sm">{inc._count.evidence} files</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild><Link href={`/incidents/${inc.id}`}>View</Link></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </ResponsiveTableWrapper>
        </CardContent>
      </Card>
    </div>
  );
}
