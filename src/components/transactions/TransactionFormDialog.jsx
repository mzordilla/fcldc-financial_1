import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TransactionFormDialog({ open, onOpenChange, title, bankAccounts = [], categories = [], onSubmit, initialData }) {
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [descSearch, setDescSearch] = useState("");
  const [showCoaSuggestions, setShowCoaSuggestions] = useState(false);

  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 200),
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("project_name", 100),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setFormData(initialData || {});
      setDescSearch(initialData?.description || "");
    }
  }, [open]);

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) return;
    setSaving(true);
    await onSubmit(formData);
    setSaving(false);
    setFormData({});
    setDescSearch("");
    onOpenChange(false);
  };

  // Filter COA suggestions
  const activeAccounts = chartOfAccounts.filter(a => a.is_active !== false);
  const coaSuggestions = descSearch.length > 0
    ? activeAccounts.filter(a =>
        a.account_name.toLowerCase().includes(descSearch.toLowerCase()) ||
        (a.account_code && a.account_code.toLowerCase().includes(descSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  const selectCoaAccount = (account) => {
    setDescSearch(account.account_name);
    set("description", account.account_name);
    // Auto-fill category if mapped
    if (account.category) set("category", account.category);
    // Auto-fill type based on account_type
    if (account.account_type === "income") set("type", "income");
    else if (account.account_type === "expense") set("type", "expense");
    setShowCoaSuggestions(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Description with COA lookup */}
          <div className="space-y-1.5 relative">
            <Label>Description * <span className="text-xs text-muted-foreground font-normal">(type to search Chart of Accounts)</span></Label>
            <Input
              required
              placeholder="e.g. Project Revenue or type to search accounts..."
              value={descSearch}
              onChange={(e) => {
                setDescSearch(e.target.value);
                set("description", e.target.value);
                setShowCoaSuggestions(true);
              }}
              onFocus={() => setShowCoaSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCoaSuggestions(false), 150)}
              autoComplete="off"
            />
            {showCoaSuggestions && coaSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                {coaSuggestions.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onMouseDown={() => selectCoaAccount(account)}
                    className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between gap-2"
                  >
                    <div>
                      {account.account_code && (
                        <span className="text-xs font-mono text-muted-foreground mr-2">{account.account_code}</span>
                      )}
                      <span className="text-sm text-foreground">{account.account_name}</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                      account.account_type === "income" ? "text-primary bg-primary/10 border-primary/20" :
                      account.account_type === "expense" ? "text-destructive bg-destructive/10 border-destructive/20" :
                      "text-muted-foreground bg-muted border-border"
                    }`}>
                      {account.account_type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₱) *</Label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.amount ?? ""}
                onChange={(e) => set("amount", parseFloat(e.target.value) || "")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={formData.type || ""} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select required value={formData.category || ""} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className={!formData.category ? "border-destructive/50" : ""}><SelectValue placeholder="Select category (required)" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Bank Account */}
          <div className="space-y-1.5">
            <Label>Account Name</Label>
            <Select
              value={formData.bank_account_id || "none"}
              onValueChange={(v) => set("bank_account_id", v === "none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {bankAccounts.filter(a => a.status !== "closed").map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_name} ({a.bank_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Project Name</Label>
              <Select
                value={formData.project_name || ""}
                onValueChange={(v) => set("project_name", v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.project_name}>
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                required
                value={formData.date || ""}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}