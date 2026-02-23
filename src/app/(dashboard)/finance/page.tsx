"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table";
import { DollarSign, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function FinancePage() {
  const [page, setPage] = useState(1);

  const { data: exceptions } = trpc.finance.exceptions.useQuery();
  const { data, isLoading } = trpc.finance.listPayments.useQuery({ page, limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-sm text-muted-foreground">Payment tracking & exceptions</p>
      </div>

      {/* Exception cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Refunds</p>
              <p className="text-2xl font-bold">{exceptions?.pendingRefunds ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mismatched</p>
              <p className="text-2xl font-bold">{exceptions?.mismatched ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold">{exceptions?.overdue ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments list */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveTableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reconciliation</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : data?.payments.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
              ) : (
                data?.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.rental.contractNumber.slice(0, 12)}</TableCell>
                    <TableCell>{p.rental.customer.firstName} {p.rental.customer.lastName}</TableCell>
                    <TableCell><Badge variant="outline">{p.type.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className={Number(p.amount) < 0 ? "text-red-600" : ""}>
                      €{Number(p.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">{p.method.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "PAID" ? "default" : p.status === "REFUND_PENDING" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.reconciliationState}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
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
