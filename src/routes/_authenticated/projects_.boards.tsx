import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Search, MoreHorizontal, CalendarDays, Download, KanbanSquare } from "lucide-react";
import { format, parseISO, isBefore, startOfToday } from "date-fns";
import { useAppState, boardActions, type BoardCardInput } from "@/lib/store";
import { STARTER_BOARD } from "@/lib/board-starter";
import { CARD_PRIORITIES, type BoardCard, type BoardColumn, type CardPriority } from "@/lib/types";
import { ProjectsTabs } from "@/components/projects-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects_/boards")({
  head: () => ({ meta: [{ title: "Boards · Majestic" }] }),
  component: BoardsPage,
});

const ACTIVE_BOARD_KEY = "timetracker.activeBoard.v1";

const priorityStyles: Record<CardPriority, string> = {
  Urgent: "bg-destructive/15 text-destructive border-destructive/30",
  High: "bg-warning/15 text-warning border-warning/30",
  Medium: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  Low: "bg-muted text-muted-foreground border-border",
};

type NameDialog = { kind: "board" | "renameBoard" | "column" | "renameColumn"; id?: string; initial: string };
type CardDialog = { columnId: string; card: BoardCard | null };
type DropTarget = { columnId: string; beforeCardId: string | null };

function BoardsPage() {
  const { boards, boardColumns, boardCards } = useAppState();
  const [activeId, setActiveId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_BOARD_KEY); } catch { return null; }
  });
  const [query, setQuery] = useState("");
  const [nameDialog, setNameDialog] = useState<NameDialog | null>(null);
  const [cardDialog, setCardDialog] = useState<CardDialog | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const board = boards.find((b) => b.id === activeId) ?? boards[0] ?? null;

  function selectBoard(id: string) {
    setActiveId(id);
    try { localStorage.setItem(ACTIVE_BOARD_KEY, id); } catch { /* ignore */ }
  }

  const columns = useMemo(
    () => board ? boardColumns.filter((c) => c.boardId === board.id).sort((a, b) => a.position - b.position) : [],
    [board, boardColumns],
  );
  const q = query.trim().toLowerCase();
  const cardsFor = (columnId: string) =>
    boardCards
      .filter((c) => c.columnId === columnId)
      .sort((a, b) => a.position - b.position);
  const matches = (c: BoardCard) =>
    !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);

  async function importStarter() {
    setImporting(true);
    const b = await boardActions.importStarter();
    setImporting(false);
    if (b) { selectBoard(b.id); toast.success(`Imported "${b.name}"`); }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData("text/plain");
    const target = dropTarget;
    setDragId(null);
    setDropTarget(null);
    if (id && target) void boardActions.moveCard(id, target.columnId, target.beforeCardId);
  }

  const hasStarter = boards.some((b) => b.name === STARTER_BOARD.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Boards</h1>
          <p className="text-sm text-muted-foreground mt-1">Kanban boards for planning project work.</p>
        </div>
        <ProjectsTabs active="/projects/boards" />
      </div>

      {!board ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-4">
          <KanbanSquare className="h-8 w-8 mx-auto text-muted-foreground" />
          <div className="text-sm text-muted-foreground">No boards yet. Create one, or import the MCSC starter backlog.</div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button className="gap-2" onClick={() => setNameDialog({ kind: "board", initial: "" })}>
              <Plus className="h-4 w-4" /> New board
            </Button>
            <Button variant="secondary" className="gap-2" disabled={importing} onClick={importStarter}>
              <Download className="h-4 w-4" /> {importing ? "Importing…" : "Import MCSC backlog"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={board.id} onValueChange={selectBoard}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>{boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Board actions"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setNameDialog({ kind: "board", initial: "" })}>
                  <Plus className="h-4 w-4" /> New board
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNameDialog({ kind: "renameBoard", id: board.id, initial: board.name })}>
                  <Pencil className="h-4 w-4" /> Rename board
                </DropdownMenuItem>
                {!hasStarter && (
                  <DropdownMenuItem disabled={importing} onClick={importStarter}>
                    <Download className="h-4 w-4" /> Import MCSC backlog
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    if (confirm(`Delete board "${board.name}" and all its cards?`)) await boardActions.remove(board.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cards…" className="pl-8" />
            </div>
            <Button variant="outline" className="gap-2 ml-auto" onClick={() => setNameDialog({ kind: "column", id: board.id, initial: "" })}>
              <Plus className="h-4 w-4" /> Add column
            </Button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 items-start">
            {columns.length === 0 && (
              <div className="w-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                This board has no columns. Add one to start adding cards.
              </div>
            )}
            {columns.map((col) => {
              const all = cardsFor(col.id);
              const visible = all.filter(matches);
              return (
                <Column
                  key={col.id}
                  column={col}
                  count={all.length}
                  isDropTarget={dragId !== null && dropTarget?.columnId === col.id}
                  onAdd={() => setCardDialog({ columnId: col.id, card: null })}
                  onRename={() => setNameDialog({ kind: "renameColumn", id: col.id, initial: col.title })}
                  onDelete={async () => {
                    if (all.length > 0 && !confirm(`Delete column "${col.title}" and its ${all.length} card(s)?`)) return;
                    await boardActions.removeColumn(col.id);
                  }}
                  onDragOver={(e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    // Hovering the column body (not a card) drops at the end.
                    if (e.target === e.currentTarget) setDropTarget({ columnId: col.id, beforeCardId: null });
                  }}
                  onDrop={handleDrop}
                >
                  {visible.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      dragging={dragId === card.id}
                      showIndicator={dragId !== null && dropTarget?.columnId === col.id && dropTarget.beforeCardId === card.id}
                      onEdit={() => setCardDialog({ columnId: col.id, card })}
                      onDelete={() => boardActions.removeCard(card.id)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", card.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(card.id);
                      }}
                      onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                      onDragOver={(e) => {
                        if (!dragId) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const below = e.clientY > rect.top + rect.height / 2;
                        const idx = all.findIndex((c) => c.id === card.id);
                        const next = below ? all[idx + 1] : card;
                        setDropTarget({ columnId: col.id, beforeCardId: next?.id ?? null });
                      }}
                    />
                  ))}
                  {dragId !== null && dropTarget?.columnId === col.id && dropTarget.beforeCardId === null && (
                    <div className="h-0.5 rounded-full bg-primary" />
                  )}
                  {visible.length === 0 && all.length > 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">No matching cards</div>
                  )}
                </Column>
              );
            })}
          </div>
        </>
      )}

      <NameDialogView
        dialog={nameDialog}
        onClose={() => setNameDialog(null)}
        onCreatedBoard={selectBoard}
      />
      <CardDialogView dialog={cardDialog} onClose={() => setCardDialog(null)} />
    </div>
  );
}

function Column({
  column, count, isDropTarget, children, onAdd, onRename, onDelete, onDragOver, onDrop,
}: {
  column: BoardColumn; count: number; isDropTarget: boolean; children: ReactNode;
  onAdd: () => void; onRename: () => void; onDelete: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void; onDrop: (e: DragEvent) => void;
}) {
  return (
    <div
      className={
        "w-72 md:w-80 shrink-0 rounded-xl border bg-card flex flex-col max-h-[calc(100vh-15rem)] transition-colors " +
        (isDropTarget ? "border-primary/50" : "border-border")
      }
    >
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold truncate">{column.title}</span>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">{count}</span>
        </div>
        <div className="flex items-center shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAdd} aria-label="Add card"><Plus className="h-3.5 w-3.5" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Column actions"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}><Pencil className="h-4 w-4" /> Rename column</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" /> Delete column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 min-h-[120px]" onDragOver={onDragOver} onDrop={onDrop}>
        {children}
      </div>
      <div className="p-2 border-t border-border/60">
        <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" /> Add card
        </Button>
      </div>
    </div>
  );
}

function CardItem({
  card, dragging, showIndicator, onEdit, onDelete, onDragStart, onDragEnd, onDragOver,
}: {
  card: BoardCard; dragging: boolean; showIndicator: boolean;
  onEdit: () => void; onDelete: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void; onDragEnd: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const overdue = card.dueDate ? isBefore(parseISO(card.dueDate), startOfToday()) : false;
  return (
    <>
      {showIndicator && <div className="h-0.5 rounded-full bg-primary" />}
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDoubleClick={onEdit}
        className={
          "group rounded-lg border border-border bg-background/60 p-3 cursor-grab active:cursor-grabbing hover:border-muted-foreground/40 transition " +
          (dragging ? "opacity-40" : "")
        }
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className={"text-[11px] font-semibold px-1.5 py-0.5 rounded border " + priorityStyles[card.priority]}>
            {card.priority}
          </span>
          <div className="flex items-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit} aria-label="Edit card"><Pencil className="h-3 w-3" /></Button>
            <Button
              variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" aria-label="Delete card"
              onClick={() => { if (confirm("Delete this card?")) onDelete(); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="text-sm font-medium leading-snug break-words">{card.title}</div>
        {card.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-3 break-words">{card.description}</p>
        )}
        {card.dueDate && (
          <div className={"flex items-center gap-1.5 text-[11px] mt-2 pt-2 border-t border-border/60 " + (overdue ? "text-destructive" : "text-muted-foreground")}>
            <CalendarDays className="h-3 w-3" />
            {format(parseISO(card.dueDate), "MMM d, yyyy")}
            {overdue && <span>· overdue</span>}
          </div>
        )}
      </div>
    </>
  );
}

function NameDialogView({
  dialog, onClose, onCreatedBoard,
}: { dialog: NameDialog | null; onClose: () => void; onCreatedBoard: (id: string) => void }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValue(dialog?.initial ?? ""); }, [dialog]);

  const titles = {
    board: "New board",
    renameBoard: "Rename board",
    column: "New column",
    renameColumn: "Rename column",
  } as const;

  async function submit() {
    const name = value.trim();
    if (!dialog || !name) return;
    setSaving(true);
    if (dialog.kind === "board") {
      const b = await boardActions.create(name);
      if (b) onCreatedBoard(b.id);
    } else if (dialog.kind === "renameBoard" && dialog.id) await boardActions.rename(dialog.id, name);
    else if (dialog.kind === "column" && dialog.id) await boardActions.addColumn(dialog.id, name);
    else if (dialog.kind === "renameColumn" && dialog.id) await boardActions.renameColumn(dialog.id, name);
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={dialog !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{dialog ? titles[dialog.kind] : ""}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Name</Label>
            <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
            {dialog?.kind === "board" && (
              <p className="text-xs text-muted-foreground mt-2">Starts with Backlog, In Progress and Done columns.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !value.trim()}>
              {dialog?.kind === "board" || dialog?.kind === "column" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CardDialogView({ dialog, onClose }: { dialog: CardDialog | null; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CardPriority>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(dialog?.card?.title ?? "");
    setDescription(dialog?.card?.description ?? "");
    setPriority(dialog?.card?.priority ?? "Medium");
    setDueDate(dialog?.card?.dueDate ?? "");
  }, [dialog]);

  async function submit() {
    if (!dialog) return;
    if (!title.trim()) { toast.error("Title required"); return; }
    const input: BoardCardInput = {
      title: title.trim(), description: description.trim(), priority, dueDate: dueDate || null,
    };
    setSaving(true);
    if (dialog.card) await boardActions.updateCard(dialog.card.id, input);
    else await boardActions.addCard(dialog.columnId, input);
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={dialog !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{dialog?.card ? "Edit card" : "New card"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Title</Label>
            <Textarea autoFocus rows={2} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Description</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CardPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CARD_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{dialog?.card ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
