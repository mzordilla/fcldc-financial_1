import { useAuth } from "@/lib/AuthContext";
import AccessDenied from "@/components/layout/AccessDenied";

export default function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role?.toLowerCase() !== "admin") return <AccessDenied />;
  return children;
}