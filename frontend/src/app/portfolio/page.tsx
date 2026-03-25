"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  GripVertical,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

// ── Types ───────────────────────────────────────────────────────────────────

type PortfolioSchool = {
  id: string;
  schoolSlug: string;
  name: string;
  status: string;
  nextAction: string | null;
  nextDeadline: string | null; // ISO date
  completionPct: number;
  result: string | null;
};

type PortfolioData = {
  schools: PortfolioSchool[];
};

// ── Constants ───────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: "researching", label: "Researching" },
  { id: "preparing", label: "Preparing" },
  { id: "drafting", label: "Drafting" },
  { id: "submitted", label: "Submitted" },
  { id: "interview", label: "Interview" },
  { id: "decided", label: "Decided" },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

// ── Deadline Helpers ────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function deadlineColor(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days < 7) return "text-red-600";
  if (days <= 30) return "text-amber-600";
  return "text-emerald-600";
}

function deadlineIcon(days: number | null) {
  if (days === null) return <Clock className="size-3.5 text-muted-foreground" />;
  if (days < 7) return <AlertTriangle className="size-3.5 text-red-600" />;
  if (days <= 30) return <Clock className="size-3.5 text-amber-600" />;
  return <CheckCircle2 className="size-3.5 text-emerald-600" />;
}

// ── Sortable School Card ────────────────────────────────────────────────────

function SchoolCard({ school }: { school: PortfolioSchool }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: school.id, data: { school } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const days = daysUntil(school.nextDeadline);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white border border-border rounded-lg p-3 space-y-2 transition-shadow",
        isDragging ? "opacity-50 shadow-lg" : "shadow-sm hover:shadow-md"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {school.name}
          </h4>
          {school.nextAction && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {school.nextAction}
            </p>
          )}
        </div>
      </div>

      {/* Deadline countdown */}
      {school.nextDeadline && (
        <div className={cn("flex items-center gap-1.5 text-xs font-medium", deadlineColor(days))}>
          {deadlineIcon(days)}
          <span>{days !== null ? `${days}d left` : "No deadline"}</span>
        </div>
      )}

      {/* Completion progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Completion</span>
          <span>{school.completionPct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all"
            style={{ width: `${school.completionPct}%` }}
          />
        </div>
      </div>

      {/* Result badge for decided column */}
      {school.result && (
        <span
          className={cn(
            "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full",
            school.result === "admitted" && "bg-emerald-100 text-emerald-700",
            school.result === "rejected" && "bg-red-100 text-red-700",
            school.result === "waitlisted" && "bg-amber-100 text-amber-700",
            school.result === "withdrew" && "bg-muted text-muted-foreground"
          )}
        >
          {school.result}
        </span>
      )}
    </div>
  );
}

// ── Overlay Card (while dragging) ───────────────────────────────────────────

function DragOverlayCard({ school }: { school: PortfolioSchool }) {
  const days = daysUntil(school.nextDeadline);
  return (
    <div className="bg-white border-2 border-gold rounded-lg p-3 shadow-xl space-y-2 w-60">
      <h4 className="text-sm font-semibold text-foreground truncate">
        {school.name}
      </h4>
      {school.nextDeadline && (
        <div className={cn("flex items-center gap-1.5 text-xs font-medium", deadlineColor(days))}>
          {deadlineIcon(days)}
          <span>{days !== null ? `${days}d left` : ""}</span>
        </div>
      )}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full"
          style={{ width: `${school.completionPct}%` }}
        />
      </div>
    </div>
  );
}

// ── Column Component ────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  schools,
  isActive,
}: {
  column: (typeof COLUMNS)[number];
  schools: PortfolioSchool[];
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-shrink-0 w-64 lg:w-auto lg:flex-1 flex flex-col rounded-lg",
        isActive ? "ring-2 ring-gold/40" : ""
      )}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {column.label}
        </h3>
        <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {schools.length}
        </span>
      </div>
      <SortableContext
        items={schools.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2 px-2 pb-2 min-h-[100px]">
          {schools.map((school) => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Main Portfolio Board ────────────────────────────────────────────────────

export default function PortfolioPage() {
  const queryClient = useQueryClient();
  const [activeSchool, setActiveSchool] = useState<PortfolioSchool | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { data, isLoading } = useQuery<PortfolioData>({
    queryKey: ["portfolio"],
    queryFn: () => apiFetch<PortfolioData>("/api/portfolio"),
    staleTime: 2 * 60 * 1000,
  });

  const updateStatus = useMutation({
    mutationFn: (args: { id: string; status: string }) =>
      apiFetch(`/api/tracked-schools/${args.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: args.status }),
      }),
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey: ["portfolio"] });
      const prev = queryClient.getQueryData<PortfolioData>(["portfolio"]);
      if (prev) {
        queryClient.setQueryData<PortfolioData>(["portfolio"], {
          ...prev,
          schools: prev.schools.map((s) =>
            s.id === args.id ? { ...s, status: args.status } : s
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _args, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["portfolio"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  const schools = data?.schools ?? [];

  const schoolsByColumn = useMemo(() => {
    const map: Record<string, PortfolioSchool[]> = {};
    for (const col of COLUMNS) {
      map[col.id] = schools.filter((s) => s.status === col.id);
    }
    return map;
  }, [schools]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const school = schools.find((s) => s.id === event.active.id);
      setActiveSchool(school ?? null);
    },
    [schools]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveSchool(null);
      const { active, over } = event;
      if (!over) return;

      // Find which column the item was dropped over
      const activeSchoolData = schools.find((s) => s.id === active.id);
      if (!activeSchoolData) return;

      // Check if dropped over a school in a different column
      const overSchool = schools.find((s) => s.id === over.id);
      let targetColumn: string | null = null;

      if (overSchool) {
        targetColumn = overSchool.status;
      } else {
        // Dropped on a column directly
        targetColumn = over.id as string;
      }

      if (targetColumn && targetColumn !== activeSchoolData.status) {
        updateStatus.mutate({ id: activeSchoolData.id, status: targetColumn });
      }
    },
    [schools, updateStatus]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" />
          <div className="flex gap-4">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex-1 space-y-3">
                <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                <div className="h-32 bg-muted rounded-lg animate-pulse" />
                <div className="h-32 bg-muted rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Application Portfolio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Drag schools between stages to track your progress
            </p>
          </div>
          <Link
            href="/schools"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            Add School
          </Link>
        </motion.div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                schools={schoolsByColumn[col.id] ?? []}
                isActive={activeSchool?.status !== col.id && activeSchool !== null}
              />
            ))}
          </div>
          <DragOverlay>
            {activeSchool ? (
              <DragOverlayCard school={activeSchool} />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Empty state */}
        {schools.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-muted-foreground mb-4">
              No schools tracked yet. Start by adding schools to your portfolio.
            </p>
            <Link
              href="/schools"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" />
              Browse Schools
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
