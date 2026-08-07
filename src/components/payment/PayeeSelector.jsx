import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown } from "lucide-react";

export default function PayeeSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef(null);
  const queryClient = useQueryClient();

  const { data: payees = [] } = useQuery({
    queryKey: ["payees"],
    queryFn: () => base44.entities.Payee.list("name", 10000),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Payee.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["payees"] });
      onChange(created.name);
      setOpen(false);
      setSearch("");
      setShowAddNew(false);
      setNewName("");
    },
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setShowAddNew(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = payees.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (name) => {
    onChange(name);
    setOpen(false);
    setSearch("");
    setShowAddNew(false);
  };

  const handleAddNew = () => {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim() });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || "Select or type payee..."}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg">
          <div className="p-2">
            <Input
              autoFocus
              placeholder="Search payee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && !showAddNew && (
              <p className="text-xs text-muted-foreground px-3 py-2">No payees found</p>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.name)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {p.name}
                {p.category && (
                  <span className="ml-2 text-xs text-muted-foreground capitalize">{p.category}</span>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-border p-2">
            {showAddNew ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="New payee name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
                  className="h-8 text-sm flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={handleAddNew}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "..." : "Add"}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setShowAddNew(true); setNewName(search); }}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline w-full"
              >
                <Plus className="w-3.5 h-3.5" /> Add new payee
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}