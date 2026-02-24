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
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRealtimeTasks } from "@/hooks/use-realtime";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  BLOCKED: "bg-red-100 text-red-800",
};

export default function TasksPage() {
  useRealtimeTasks();
  const { data: session } = useSession();
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "general", description: "", priority: "MEDIUM", dueAt: "" });

  const statusParam = statusFilter === "active" ? undefined : statusFilter !== "all" ? statusFilter as any : undefined;
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.task.list.useQuery({ status: statusParam, page, limit: 20 });

  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      toast.success("Task created");
      setDialogOpen(false);
      setForm({ title: "", type: "general", description: "", priority: "MEDIUM", dueAt: "" });
      utils.task.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.task.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); utils.task.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} tasks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!session?.user?.branchId) return toast.error("No branch assigned");
              createTask.mutate({
                title: form.title,
                type: form.type,
                description: form.description || undefined,
                priority: form.priority as any,
                dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
                branchId: session.user.branchId,
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="handover">Handover</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createTask.isPending}>{createTask.isPending ? "Creating..." : "Create Task"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active (Open)</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <ResponsiveTableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : data?.tasks.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tasks found</TableCell></TableRow>
              ) : (
                data?.tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><Badge variant="secondary" className={PRIORITY_COLORS[t.priority]}>{t.priority}</Badge></TableCell>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.type}</TableCell>
                    <TableCell>{t.assignee?.name ?? "Unassigned"}</TableCell>
                    <TableCell>{t.branch.code}</TableCell>
                    <TableCell className="text-sm">
                      {t.dueAt ? (
                        <span className={new Date(t.dueAt) < new Date() && t.status !== "COMPLETED" ? "text-red-600 font-medium" : ""}>
                          {new Date(t.dueAt).toLocaleDateString()}
                        </span>
                      ) : "–"}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className={STATUS_COLORS[t.status]}>{t.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      {t.status === "PENDING" && (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: t.id, status: "IN_PROGRESS" as any })}>Start</Button>
                      )}
                      {t.status === "IN_PROGRESS" && (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: t.id, status: "COMPLETED" as any })}>Complete</Button>
                      )}
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
