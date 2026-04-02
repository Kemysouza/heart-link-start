import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Calendar, Users, MessageSquare, LogOut, Settings } from "lucide-react";

const PsychologistDashboard = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">MindCare</h2>
              <p className="text-xs text-muted-foreground">Painel do Psicólogo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Olá, {profile?.nome_completo || "Profissional"}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground">
            Bem-vindo(a), {profile?.nome_completo?.split(" ")[0] || "Profissional"}!
          </h1>
          <p className="text-muted-foreground mt-1">Aqui está o resumo do seu consultório</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
          {[
            { icon: Users, label: "Pacientes", value: "0", desc: "Ativos" },
            { icon: Calendar, label: "Consultas", value: "0", desc: "Esta semana" },
            { icon: MessageSquare, label: "Mensagens", value: "0", desc: "Não lidas" },
            { icon: Settings, label: "Perfil", value: "100%", desc: "Completo" },
          ].map(({ icon: Icon, label, value, desc }) => (
            <Card key={label} className="shadow-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <Icon className="w-5 h-5 text-accent-foreground" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{label} · {desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle>Próximas Consultas</CardTitle>
              <CardDescription>Agenda do dia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhuma consulta agendada</p>
                <p className="text-sm">As consultas aparecerão aqui</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle>Pacientes Recentes</CardTitle>
              <CardDescription>Últimos atendimentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhum paciente ainda</p>
                <p className="text-sm">Seus pacientes aparecerão aqui</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PsychologistDashboard;
