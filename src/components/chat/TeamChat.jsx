import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageCircle, X, Send, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TeamChat() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  // Default position: bottom-24 right-6 (above the approval button area)
  const [pos, setPos] = useState({ right: 24, bottom: 96 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const btnRef = useRef(null);
  const bottomRef = useRef(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: () => base44.entities.ChatMessage.list("created_date", 100),
    refetchInterval: open ? 5000 : false,
  });

  useEffect(() => {
    const unsub = base44.entities.ChatMessage.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    });
    return unsub;
  }, [queryClient]);

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [messages, open]);

  // Drag logic
  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    const rect = btnRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      const newRight = window.innerWidth - e.clientX - (56 - dragOffset.current.x);
      const newBottom = window.innerHeight - e.clientY - (56 - dragOffset.current.y);
      setPos({
        right: Math.max(8, Math.min(newRight, window.innerWidth - 64)),
        bottom: Math.max(8, Math.min(newBottom, window.innerHeight - 64)),
      });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    // Touch support
    const onTouchMove = (e) => {
      if (!dragging.current) return;
      const t = e.touches[0];
      const newRight = window.innerWidth - t.clientX - (56 - dragOffset.current.x);
      const newBottom = window.innerHeight - t.clientY - (56 - dragOffset.current.y);
      setPos({
        right: Math.max(8, Math.min(newRight, window.innerWidth - 64)),
        bottom: Math.max(8, Math.min(newBottom, window.innerHeight - 64)),
      });
    };
    const onTouchEnd = () => { dragging.current = false; };
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const onTouchStart = (e) => {
    dragging.current = true;
    const t = e.touches[0];
    const rect = btnRef.current.getBoundingClientRect();
    dragOffset.current = { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };

  const sendMutation = useMutation({
    mutationFn: (msg) => base44.entities.ChatMessage.create(msg),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-messages"] }),
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMutation.mutate({
      sender_name: user?.full_name || user?.email || "User",
      sender_email: user?.email || "",
      message: text.trim(),
    });
    setText("");
  };

  const fmtTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) +
      " · " + d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  };

  const initials = (name) => name ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  const avatarColor = (email) => {
    const colors = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-teal-500", "bg-indigo-500"];
    let hash = 0;
    for (let c of (email || "")) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Panel position: open above the button
  const panelStyle = {
    position: "fixed",
    right: pos.right,
    bottom: pos.bottom + 64,
    zIndex: 51,
  };

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div style={panelStyle} className="w-80 sm:w-96 h-[480px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Team Chat</p>
              <p className="text-xs opacity-75">Company-wide</p>
            </div>
            <button onClick={() => setOpen(false)} className="opacity-75 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-muted-foreground text-sm mt-8">No messages yet. Say hello! 👋</p>
            )}
            {messages.map((msg) => {
              const isMe = msg.sender_email === user?.email;
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${avatarColor(msg.sender_email)}`}>
                    {initials(msg.sender_name)}
                  </div>
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {!isMe && <p className="text-xs text-muted-foreground font-medium">{msg.sender_name}</p>}
                    <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                      {msg.message}
                    </div>
                    <p className="text-xs text-muted-foreground">{fmtTime(msg.created_date)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-sm"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={!text.trim() || sendMutation.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Draggable floating button */}
      <button
        ref={btnRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={() => setOpen(v => !v)}
        style={{ position: "fixed", right: pos.right, bottom: pos.bottom, zIndex: 52, cursor: "grab" }}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity select-none"
        title="Team Chat (drag to move)"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
}