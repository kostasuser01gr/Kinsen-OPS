"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table";
import { AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const SEVERITY_COLORS: Record<string, string> = {
  MINOR: "bg-yellow-100 text-yellow-700",
  MODERATE: "bg-orange-100 text-orange-700",
  MAJOR: "bg-red-100 text-red-700",
  CRITICAL: "bg-red-200 text-red-900",
};

export default function IncidentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.incident.list.useQuery({ page, limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incidents & Damage</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} incidents</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Report Incident
        </Button>
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
                    <TableCell>
                      <Badge variant="secondary" className={SEVERITY_COLORS[inc.severity]}>{inc.severity}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{inc.vehicle.plate}</TableCell>
                    <TableCell>{inc.branch.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{inc.description}</TableCell>
                    <TableCell><Badge variant="outline">{inc.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{inc.claimsStatus.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-sm">{inc.reportedBy.name}</TableCell>
                    <TableCell className="text-sm">{inc._count.evidence} files</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/incidents/${inc.id}`}>View</Link>
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
    </div>
  );
}
