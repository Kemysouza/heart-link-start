import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowLeft, User, Award, Briefcase, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PsychologistInfo {
  user_id: string;
  nome_completo: string | null;
  crp: string;
  trajetoria_profissional: string | null;
  especializacoes: string[] | null;
}

const FindPsychologists = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [psychologists, setPsychologists] = useState<PsychologistInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    fetchPsychologists();
  }, []);

  const fetchPsychologists = async () => {
    try {
      // Fetch all psychologist profiles
      const { data: psychProfiles, error: psychError } = await supabase
        .from("psychologist_profiles")
        .select("user_id, crp, trajetoria_profissional, especializacoes");

      if (psychError) throw psychError;

      if (!psychProfiles || psychProfiles.length === 0) {
        setPsychologists([]);
        setLoading(false);
        return;
      }

      // For each psychologist, get their name from profiles
      const userIds = psychProfiles.map((p) => p.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, nome_completo")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.nome_completo]) || []);

      const combined: PsychologistInfo[] = psychProfiles.map((pp) => ({
        user_id: pp.user_id,
        nome_completo: profileMap.get(pp.user_id) || null,
        crp: pp.crp,
        trajetoria_profissional: pp.trajetoria_profissional,
        especializacoes: pp.especializacoes,
      }));

      setPsychologists(combined);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao carregar psicólogos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChoose = async (psychologistId: string) => {
    if (!user) return;
    setLinking(psychologistId);
    try {
      // Check if already linked
      const { data: existing } = await supabase
        .from("psychologist_patients")
        .select("id")
        .eq("psychologist_id", psychologistId)
        .eq("patient_id", user.id)
        .maybeSingle();

      if (existing) {
        toast({ title: "Você já está vinculado a este profissional" });
        setLinking(null);
        return;
      }

      const { error } = await supabase.from("psychologist_patients").insert({
        psychologist_id: psychologistId,
        patient_id: user.id,
      });

      if (error) throw error;

      toast({ title: "Vinculado com sucesso!", description: "Você agora pode agendar consultas com este profissional." });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao vincular", variant: "destructive" });
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/paciente")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Encontrar Psicólogos</h2>
                <p className="text-xs text-muted-foreground">Profissionais disponíveis</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Psicólogos Cadastrados</h1>
          <p className="text-muted-foreground mt-1">Escolha um profissional para iniciar seu acompanhamento</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">Carregando...</div>
        ) : psychologists.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Nenhum psicólogo cadastrado ainda</p>
            <p className="text-sm">Novos profissionais aparecerão aqui</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
            {psychologists.map((psych) => (
              <Card key={psych.user_id} className="shadow-card border-0 hover:shadow-elevated transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                      <User className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">
                        {psych.nome_completo || "Profissional"}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Award className="w-3.5 h-3.5" />
                        <span>CRP: {psych.crp}</span>
                      </div>
                    </div>
                  </div>

                  {psych.especializacoes && psych.especializacoes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Especializações</p>
                      <div className="flex flex-wrap gap-1.5">
                        {psych.especializacoes.map((esp, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {esp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {psych.trajetoria_profissional && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1 mb-1">
                        <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground">Trajetória Profissional</p>
                      </div>
                      <p className="text-sm text-foreground line-clamp-3">{psych.trajetoria_profissional}</p>
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">Agenda</p>
                    </div>
                    <p className="text-sm text-muted-foreground italic">Disponível para agendamento</p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleChoose(psych.user_id)}
                    disabled={linking === psych.user_id}
                  >
                    {linking === psych.user_id ? "Vinculando..." : "Escolher Profissional"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default FindPsychologists;
