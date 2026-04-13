import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, Calendar, Users, LogOut, FileText, Plus, Download, Eye, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

interface PatientData {
  user_id: string;
  nome_completo: string | null;
  data_nascimento: string | null;
  genero: string | null;
  estado_civil: string | null;
  profissao: string | null;
  queixa_principal: string | null;
  historico_familiar: string | null;
  medicamentos: string | null;
  tratamentos_anteriores: string | null;
  expectativas: string | null;
}

interface ConsultationData {
  id: string;
  patient_id: string;
  notes: string | null;
  status: "em_andamento" | "finalizado" | "cancelado";
  next_appointment: string | null;
  payment: "pendente" | "pago" | "nao_pago";
}

const PsychologistDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [consultations, setConsultations] = useState<ConsultationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesPatientId, setNotesPatientId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [fichaDialogOpen, setFichaDialogOpen] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch linked patients
    const { data: links } = await supabase
      .from("psychologist_patients")
      .select("patient_id")
      .eq("psychologist_id", user.id);

    if (links && links.length > 0) {
      const patientIds = links.map((l) => l.patient_id);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nome_completo")
        .in("user_id", patientIds);

      // Fetch patient profiles
      const { data: patientProfiles } = await supabase
        .from("patient_profiles")
        .select("*")
        .in("user_id", patientIds);

      const merged: PatientData[] = patientIds.map((pid) => {
        const prof = profiles?.find((p) => p.user_id === pid);
        const pat = patientProfiles?.find((p) => p.user_id === pid);
        return {
          user_id: pid,
          nome_completo: prof?.nome_completo || null,
          data_nascimento: pat?.data_nascimento || null,
          genero: pat?.genero || null,
          estado_civil: pat?.estado_civil || null,
          profissao: pat?.profissao || null,
          queixa_principal: pat?.queixa_principal || null,
          historico_familiar: pat?.historico_familiar || null,
          medicamentos: pat?.medicamentos || null,
          tratamentos_anteriores: pat?.tratamentos_anteriores || null,
          expectativas: pat?.expectativas || null,
        };
      });
      setPatients(merged);

      // Fetch consultations
      const { data: consults } = await supabase
        .from("consultations")
        .select("*")
        .eq("psychologist_id", user.id);

      setConsultations((consults as ConsultationData[]) || []);
    }
    setLoading(false);
  };

  const getConsultation = (patientId: string): ConsultationData | undefined => {
    return consultations.find((c) => c.patient_id === patientId);
  };

  const handleSaveNotes = async () => {
    if (!user || !notesPatientId) return;
    const existing = getConsultation(notesPatientId);

    try {
      if (existing) {
        const { error } = await supabase
          .from("consultations")
          .update({ notes: newNote })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("consultations")
          .insert({
            psychologist_id: user.id,
            patient_id: notesPatientId,
            notes: newNote,
          });
        if (error) throw error;
      }
      toast.success("Anotação salva!");
      setNotesDialogOpen(false);
      setNewNote("");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleStatusChange = async (patientId: string, status: string) => {
    if (!user) return;
    const existing = getConsultation(patientId);
    try {
      if (existing) {
        const { error } = await supabase
          .from("consultations")
          .update({ status: status as "em_andamento" | "finalizado" | "cancelado" })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("consultations")
          .insert([{ psychologist_id: user.id, patient_id: patientId, status: status as "em_andamento" | "finalizado" | "cancelado" }]);
        if (error) throw error;
      }
      toast.success("Status atualizado!");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    }
  };

  const handlePaymentChange = async (patientId: string, payment: string) => {
    if (!user) return;
    const existing = getConsultation(patientId);
    try {
      if (existing) {
        const { error } = await supabase
          .from("consultations")
          .update({ payment })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("consultations")
          .insert({ psychologist_id: user.id, patient_id: patientId, payment });
        if (error) throw error;
      }
      toast.success("Pagamento atualizado!");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    }
  };

  const handleNextAppointmentChange = async (patientId: string, date: string) => {
    if (!user) return;
    const existing = getConsultation(patientId);
    try {
      if (existing) {
        const { error } = await supabase
          .from("consultations")
          .update({ next_appointment: date || null })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("consultations")
          .insert({ psychologist_id: user.id, patient_id: patientId, next_appointment: date || null });
        if (error) throw error;
      }
      toast.success("Próxima consulta atualizada!");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    }
  };

  const downloadAnamnese = async (patient: PatientData) => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Ficha de Anamnese", bold: true })] }),
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({ children: [new TextRun({ text: "Nome: ", bold: true }), new TextRun(patient.nome_completo || "—")] }),
          new Paragraph({ children: [new TextRun({ text: "Data de Nascimento: ", bold: true }), new TextRun(patient.data_nascimento || "—")] }),
          new Paragraph({ children: [new TextRun({ text: "Gênero: ", bold: true }), new TextRun(patient.genero || "—")] }),
          new Paragraph({ children: [new TextRun({ text: "Estado Civil: ", bold: true }), new TextRun(patient.estado_civil || "—")] }),
          new Paragraph({ children: [new TextRun({ text: "Profissão: ", bold: true }), new TextRun(patient.profissao || "—")] }),
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Queixa Principal", bold: true })] }),
          new Paragraph({ children: [new TextRun(patient.queixa_principal || "Não informado")] }),
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Histórico Familiar", bold: true })] }),
          new Paragraph({ children: [new TextRun(patient.historico_familiar || "Não informado")] }),
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Medicamentos", bold: true })] }),
          new Paragraph({ children: [new TextRun(patient.medicamentos || "Não informado")] }),
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Tratamentos Anteriores", bold: true })] }),
          new Paragraph({ children: [new TextRun(patient.tratamentos_anteriores || "Não informado")] }),
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Expectativas", bold: true })] }),
          new Paragraph({ children: [new TextRun(patient.expectativas || "Não informado")] }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `anamnese_${(patient.nome_completo || "paciente").replace(/\s+/g, "_")}.docx`);
    toast.success("Ficha baixada com sucesso!");
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "em_andamento": return "Em andamento";
      case "finalizado": return "Finalizado";
      case "cancelado": return "Cancelado";
      default: return "—";
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "em_andamento": return "bg-accent text-accent-foreground";
      case "finalizado": return "bg-primary/20 text-primary";
      case "cancelado": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const paymentLabel = (p: string) => {
    switch (p) {
      case "pago": return "Pago";
      case "nao_pago": return "Não pago";
      case "pendente": return "Pendente";
      default: return "—";
    }
  };

  const paymentColor = (p: string) => {
    switch (p) {
      case "pago": return "bg-primary/20 text-primary";
      case "nao_pago": return "bg-destructive/20 text-destructive";
      case "pendente": return "bg-accent text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

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

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8 animate-slide-up">
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{patients.length}</p>
              <p className="text-sm text-muted-foreground">Pacientes · Ativos</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {consultations.filter((c) => c.next_appointment).length}
              </p>
              <p className="text-sm text-muted-foreground">Consultas · Agendadas</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {consultations.filter((c) => c.status === "em_andamento").length}
              </p>
              <p className="text-sm text-muted-foreground">Consultas · Em andamento</p>
            </CardContent>
          </Card>
        </div>

        {/* Patients Table */}
        <Card className="shadow-card border-0 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> Pacientes
            </CardTitle>
            <CardDescription>Lista de todos os pacientes vinculados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : patients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhum paciente vinculado ainda</p>
                <p className="text-sm">Pacientes aparecerão aqui quando se cadastrarem</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Nascimento</TableHead>
                      <TableHead>Anamnese</TableHead>
                      <TableHead>Histórico</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Próxima Consulta</TableHead>
                      <TableHead>Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => {
                      const consultation = getConsultation(patient.user_id);
                      return (
                        <TableRow key={patient.user_id}>
                          <TableCell className="font-medium">{patient.nome_completo || "—"}</TableCell>
                          <TableCell>{patient.data_nascimento || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedPatient(patient); setFichaDialogOpen(true); }}
                                title="Ver ficha"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadAnamnese(patient)}
                                title="Baixar Word"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNotesPatientId(patient.user_id);
                                setNewNote(consultation?.notes || "");
                                setNotesDialogOpen(true);
                              }}
                            >
                              <StickyNote className="w-3 h-3 mr-1" />
                              {consultation?.notes ? "Editar" : "Adicionar"}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={consultation?.status || "em_andamento"}
                              onValueChange={(v) => handleStatusChange(patient.user_id, v)}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="em_andamento">Em andamento</SelectItem>
                                <SelectItem value="finalizado">Finalizado</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <input
                              type="date"
                              className="border rounded px-2 py-1 text-xs bg-background text-foreground"
                              value={consultation?.next_appointment?.split("T")[0] || ""}
                              onChange={(e) => handleNextAppointmentChange(patient.user_id, e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={consultation?.payment || "pendente"}
                              onValueChange={(v) => handlePaymentChange(patient.user_id, v)}
                            >
                              <SelectTrigger className="w-[120px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pago">Pago</SelectItem>
                                <SelectItem value="nao_pago">Não pago</SelectItem>
                                <SelectItem value="pendente">Pendente</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog: Ver Ficha de Anamnese */}
      <Dialog open={fichaDialogOpen} onOpenChange={setFichaDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ficha de Anamnese — {selectedPatient?.nome_completo}</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4 text-sm">
              <div><strong>Data de Nascimento:</strong> {selectedPatient.data_nascimento || "—"}</div>
              <div><strong>Gênero:</strong> {selectedPatient.genero || "—"}</div>
              <div><strong>Estado Civil:</strong> {selectedPatient.estado_civil || "—"}</div>
              <div><strong>Profissão:</strong> {selectedPatient.profissao || "—"}</div>
              <hr className="border-border" />
              <div><strong>Queixa Principal:</strong><p className="mt-1 text-muted-foreground">{selectedPatient.queixa_principal || "Não informado"}</p></div>
              <div><strong>Histórico Familiar:</strong><p className="mt-1 text-muted-foreground">{selectedPatient.historico_familiar || "Não informado"}</p></div>
              <div><strong>Medicamentos:</strong><p className="mt-1 text-muted-foreground">{selectedPatient.medicamentos || "Não informado"}</p></div>
              <div><strong>Tratamentos Anteriores:</strong><p className="mt-1 text-muted-foreground">{selectedPatient.tratamentos_anteriores || "Não informado"}</p></div>
              <div><strong>Expectativas:</strong><p className="mt-1 text-muted-foreground">{selectedPatient.expectativas || "Não informado"}</p></div>
              <Button onClick={() => downloadAnamnese(selectedPatient)} className="w-full gradient-primary text-primary-foreground">
                <Download className="w-4 h-4 mr-2" /> Baixar como Word
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Anotações */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anotações da Consulta</DialogTitle>
          </DialogHeader>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Escreva suas anotações sobre a consulta..."
            rows={6}
          />
          <Button onClick={handleSaveNotes} className="w-full gradient-primary text-primary-foreground">
            Salvar Anotação
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PsychologistDashboard;
