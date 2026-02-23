"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table";
import { Plus } from "lucide-react";
import { useState } from "react";

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
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [page, setPage] = useState(1);

  const statusParam = statusFilter === "active" ? undefined : statusFilter !== "all" ? statusFilter as any : undefined;

  const { data, isLoading } = trpc.task.list.useQuery({
    status: statusParam,
    page,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} tasks</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : data?.tasks.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tasks found</TableCell></TableRow>
              ) : (
                data?.tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant="secondary" className={PRIORITY_COLORS[t.priority]}>{t.priority}</Badge>
                    </TableCell>
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
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_COLORS[t.status]}>{t.status.replace("_", " ")}</Badge>
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
