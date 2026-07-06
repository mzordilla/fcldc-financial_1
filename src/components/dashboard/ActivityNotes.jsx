import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ActivityNotes() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", note_date: "", details: "" });

  const { data: notes = [] } = useQuery({
    queryKey: ["activitynotes"],
    queryFn: () => base44.entities.ActivityNote.list("-note_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ActivityNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activitynotes"] });
      setForm({ title: "", note_date: "", details: "" });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ActivityNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activitynotes"] }),
  });

  const grouped = notes.reduce((acc, n) => {
    const key = n.note_date || "No date";
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.note_date) return;
    createMutation.mutate(form);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Highlighted Activities
        </h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Note
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Calendar summary of your notes</p>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {sortedDates.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
        )}
        {sortedDates.map((date) => (
          <div key={date}>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {date !== "No date" ? format(new Date(date), "EEEE, MMM d, yyyy") : "No date"}
            </p>
            <ul className="space-y-2">
              {grouped[date].map((n) => (
                <li
                  key={n.id}
                  className="flex items-start justify-between gap-2 bg-secondary/50 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">{n.details}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(n.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Site inspection"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Date</label>
              <Input
                type="date"
                value={form.note_date}
                onChange={(e) => setForm({ ...form, note_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Details</label>
              <Input
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                placeholder="Optional details"
              />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}