import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { IconFlag3Filled, IconMessageCircle } from "@tabler/icons-react";
import {
  TASK_COLUMNS, TASK_STATUS, TASK_PRIORITY, TASK_CATEGORY, initials, avatarColor, dueMeta,
} from "../constants";

function TaskCardContent({ task, projectKey }) {
  const due = dueMeta(task.due_date);
  const commentCount = (task.comments || []).length;
  const p = TASK_PRIORITY[task.priority] || { label: task.priority, text: "text-slate-400" };
  return (
    <>
      <p className="mb-2 line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-100">{task.title}</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          {TASK_CATEGORY[task.category] || task.category}
        </span>
        {due && (
          <span className={`rounded px-1.5 py-0.5 text-xs ${due.bg} ${due.text}`}>{due.label}</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <IconFlag3Filled size={13} className={p.text} title={`${p.label} priority`} />
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{projectKey}-{task.id}</span>
          {commentCount > 0 && (
            <span className="ml-1 flex items-center gap-0.5 text-xs text-slate-400 dark:text-slate-500">
              <IconMessageCircle size={13} /> {commentCount}
            </span>
          )}
        </div>
        <div className="flex -space-x-2">
          {(task.assignees || []).slice(0, 3).map((a) => (
            <div key={a.id} title={a.name}
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white dark:border-slate-800 ${avatarColor(a.name)}`}>
              {initials(a.name)}
            </div>
          ))}
          {(task.assignees || []).length > 3 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-400 text-[10px] font-semibold text-white dark:border-slate-800 dark:bg-slate-600">
              +{task.assignees.length - 3}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SortableTaskCard({ task, projectKey, isDragDisabled, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(task.id), disabled: isDragDisabled,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={() => onOpen && onOpen(task)}
      className={`mb-2.5 cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:border-indigo-200 hover:shadow-md dark:bg-slate-800 dark:shadow-none dark:hover:border-indigo-500/50 ${
        isDragging ? "border-indigo-300 ring-2 ring-indigo-200 dark:border-indigo-500 dark:ring-indigo-500/30" : "border-slate-200 dark:border-slate-700"}`}>
      <TaskCardContent task={task} projectKey={projectKey} />
    </div>
  );
}

function Column({ col, items, canEdit, projectKey, onOpenTask }) {
  const meta = TASK_STATUS[col];
  const { setNodeRef, isOver } = useDroppable({ id: col });
  return (
    <div ref={setNodeRef}
      className={`w-[272px] shrink-0 rounded-xl border p-2.5 transition-colors ${
        isOver ? "border-indigo-300 bg-indigo-50/70 dark:border-indigo-500/50 dark:bg-indigo-500/10" : "border-slate-200/70 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"}`}>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{meta.label}</span>
        </div>
        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700/70 dark:text-slate-300">{items.length}</span>
      </div>
      <SortableContext items={items.map((t) => String(t.id))} strategy={verticalListSortingStrategy}>
        <div className="min-h-10">
          {items.map((task) => (
            <SortableTaskCard key={task.id} task={task} projectKey={projectKey}
              isDragDisabled={!canEdit} onOpen={onOpenTask} />
          ))}
          {items.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard({ tasks, onStatusChange, canEdit = true, projectKey = "TASK", onOpenTask }) {
  const [activeTask, setActiveTask] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grouped = TASK_COLUMNS.reduce((acc, col) => {
    acc[col] = tasks.filter((t) => t.status === col).sort((a, b) => a.id - b.id);
    return acc;
  }, {});

  const findColumn = (id) => {
    if (TASK_COLUMNS.includes(id)) return id;
    const task = tasks.find((t) => String(t.id) === String(id));
    return task ? task.status : null;
  };

  const onDragStart = (event) => {
    const task = tasks.find((t) => String(t.id) === String(event.active.id));
    setActiveTask(task || null);
  };

  const onDragEnd = (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const sourceCol = findColumn(active.id);
    const destCol = findColumn(over.id);
    if (!destCol || sourceCol === destCol) return;
    onStatusChange(Number(active.id), destCol);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex items-start gap-4 overflow-x-auto pb-2">
        {TASK_COLUMNS.map((col) => (
          <Column key={col} col={col} items={grouped[col]} canEdit={canEdit}
            projectKey={projectKey} onOpenTask={onOpenTask} />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="w-[272px] rotate-2 rounded-lg border border-indigo-300 bg-white p-3 shadow-xl ring-2 ring-indigo-100 dark:border-indigo-500 dark:bg-slate-800 dark:ring-indigo-500/20">
            <TaskCardContent task={activeTask} projectKey={projectKey} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
