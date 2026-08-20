import { FileText, Download, Trash2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isWithinInterval, addDays } from "date-fns";

function ExpiryBadge({ date }) {
  if (!date) return null;
  const d = new Date(date);
  const expired = isPast(d);
  const soon = !expired && isWithinInterval(d, { start: new Date(), end: addDays(new Date(), 30) });
  return (
    <span className={`text-xs ${expired ? "text-destructive" : soon ? "text-amber-600" : "text-muted-foreground"}`}>
      {expired ? "Expired " : "Expires "}{format(d, "MMM d, yyyy")}
    </span>
  );
}

export default function DocumentCategoryGroup({ category, docs, isExpanded, onToggle, onDelete }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
        onClick={onToggle}
      >
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
        <Badge variant="outline" className={`text-xs ${category.color}`}>{category.label}</Badge>
        <span className="text-xs text-muted-foreground">
          {docs.length} document{docs.length !== 1 ? "s" : ""}
        </span>
      </button>

      {isExpanded && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Document</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Issued By</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Expiry</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Uploaded By</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {docs.map(doc => (
              <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{doc.name}</p>
                      {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>}
                      {doc.tags && <p className="text-xs text-muted-foreground/60 mt-0.5">{doc.tags}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{doc.issued_by || "—"}</td>
                <td className="px-4 py-3 hidden md:table-cell"><ExpiryBadge date={doc.expiry_date} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{doc.uploaded_by || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title="Download">
                        <Download className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                      </a>
                    )}
                    <button onClick={() => onDelete(doc.id)} title="Delete">
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}