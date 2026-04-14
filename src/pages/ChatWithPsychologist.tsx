import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, ArrowLeft, Send } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const ChatWithPsychologist = () => {
  const { user } = useAuth();
  const { psychologistId } = useParams<{ psychologistId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [psychName, setPsychName] = useState("Profissional");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!psychologistId) return;
    fetchPsychName();
    fetchMessages();

    const channel = supabase
      .channel(`chat-${psychologistId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user?.id && msg.receiver_id === psychologistId) ||
            (msg.sender_id === psychologistId && msg.receiver_id === user?.id)
          ) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [psychologistId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchPsychName = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("nome_completo")
      .eq("user_id", psychologistId!)
      .maybeSingle();
    if (data?.nome_completo) setPsychName(data.nome_completo);
  };

  const fetchMessages = async () => {
    if (!user || !psychologistId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${psychologistId}),and(sender_id.eq.${psychologistId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);

    // Mark received messages as read
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", psychologistId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !psychologistId) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: psychologistId,
        content: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="container mx-auto flex items-center gap-3 py-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <Brain className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{psychName}</h2>
            <p className="text-xs text-muted-foreground">Chat</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-2xl space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma mensagem ainda</p>
              <p className="text-sm">Envie uma mensagem para iniciar a conversa</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-accent text-accent-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-card shrink-0 p-4">
        <div className="container mx-auto max-w-2xl flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || sending} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWithPsychologist;
