import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <ShieldOff className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
      <p className="text-muted-foreground max-w-sm">
        You don't have permission to view this page. Please contact your administrator.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Go to Dashboard</Link>
      </Button>
    </div>
  );
}