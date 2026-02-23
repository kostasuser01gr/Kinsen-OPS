"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  ListTodo,
  AlertTriangle,
  DollarSign,
  FileText,
  BarChart3,
  Wrench,
  User as UserIcon,
} from "lucide-react";

interface MessageProps {
  role: string;
  content: string;
  toolName?: string | null;
  toolOutput?: Record<string, unknown> | null;
  createdAt: string | Date;
}

const toolIcons: Record<string, typeof Car> = {
  fleet: Car,
  task: ListTodo,
  incident: AlertTriangle,
  finance: DollarSign,
  rental: FileText,
  analytics: BarChart3,
};

function getToolIcon(toolName: string) {
  const category = toolName.split(".")[0];
  return toolIcons[category] || Wrench;
}

function ToolResultCard({ toolName, toolOutput }: { toolName: string; toolOutput: Record<string, unknown> }) {
  const Icon = getToolIcon(toolName);
  const result = toolOutput as { success?: boolean; data?: unknown; displayMode?: string; title?: string };
  const displayMode = result.displayMode || "text";

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{result.title || toolName}</span>
        <Badge variant={result.success ? "default" : "destructive"} className="ml-auto text-[10px] px-1.5 py-0">
          {result.success ? "OK" : "ERROR"}
        </Badge>
      </div>

      {/* Body */}
      <div className="p-3">
        {displayMode === "table" && Array.isArray(result.data) ? (
          <TableView data={result.data} />
        ) : displayMode === "stat" && typeof result.data === "object" ? (
          <StatView data={result.data as Record<string, unknown>} />
        ) : (
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function TableView({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No results</p>;

  const keys = Object.keys(data[0]).filter((k) => k !== "id");

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            {keys.map((k) => (
              <th key={k} className="px-2 py-1.5 text-left font-medium text-muted-foreground uppercase">
                {k.replace(/([A-Z])/g, " $1").trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
              {keys.map((k) => (
                <td key={k} className="px-2 py-1.5">
                  <CellValue value={row[k]} field={k} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellValue({ value, field }: { value: unknown; field: string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;

  if (field === "status" || field === "priority" || field === "severity" || field === "paymentStatus") {
    const colorMap: Record<string, string> = {
      AVAILABLE: "bg-green-100 text-green-800",
      ON_RENT: "bg-blue-100 text-blue-800",
      ACTIVE: "bg-blue-100 text-blue-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      IN_PROGRESS: "bg-blue-100 text-blue-800",
      COMPLETED: "bg-green-100 text-green-800",
      URGENT: "bg-red-100 text-red-800",
      HIGH: "bg-orange-100 text-orange-800",
      MAJOR: "bg-red-100 text-red-800",
      CRITICAL: "bg-red-100 text-red-800",
      PAID: "bg-green-100 text-green-800",
      BLOCKED: "bg-red-100 text-red-800",
    };
    const v = String(value);
    return (
      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-normal", colorMap[v] || "")}>
        {v.replace(/_/g, " ")}
      </Badge>
    );
  }

  return <span>{String(value)}</span>;
}

function StatView({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);

  // If one level has nested object (like byStatus), flatten
  const flat: [string, unknown][] = [];
  entries.forEach(([key, value]) => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
        flat.push([k.replace(/_/g, " "), v]);
      });
    } else {
      flat.push([key.replace(/([A-Z])/g, " $1").trim(), value]);
    }
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {flat.map(([label, value]) => (
        <div key={label} className="rounded-md border bg-muted/30 p-2 text-center">
          <p className="text-lg font-bold">{String(value)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function MessageBubble({ role, content, toolName, toolOutput, createdAt }: MessageProps) {
  const isUser = role === "user";
  const isToolResult = role === "tool_result";
  const time = new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isToolResult && toolName && toolOutput) {
    return (
      <div className="flex flex-col gap-1 max-w-2xl">
        <ToolResultCard toolName={toolName} toolOutput={toolOutput} />
        <span className="text-[10px] text-muted-foreground ml-1">{time}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-md rounded-2xl px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <Wrench className="h-3 w-3" />
            <span className="text-[10px] font-medium uppercase">System</span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        <p className={cn("text-[10px] mt-1", isUser ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {time}
        </p>
      </div>
    </div>
  );
}
