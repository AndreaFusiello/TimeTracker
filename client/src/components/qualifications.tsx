import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Download, Edit, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertQualificationSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter } from "date-fns";
import { it } from "date-fns/locale";

const formSchema = z.object({
  operatorId: z.string().min(1, "Operatore richiesto"),
  qualificationType: z.enum(['MT', 'UT', 'VT', 'PT', 'RT', 'ET', 'LT']),
  level: z.enum(['Livello 1', 'Livello 2', 'Livello 3']),
  certificationNumber: z.string().optional(),
  issuingBody: z.string().min(1, "Ente certificatore richiesto"),
  issueDate: z.string().min(1, "Data rilascio richiesta"),
  expiryDate: z.string().min(1, "Data scadenza richiesta"),
  status: z.enum(['active', 'expired', 'suspended']).default('active'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface QualificationWithOperator {
  id: string;
  operatorId: string;
  qualificationType: string;
  level: string;
  certificationNumber?: string;
  issuingBody: string;
  issueDate: string;
  expiryDate: string;
  documentPath?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  operator: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const qualificationTypeLabels = {
  'MT': 'Magnetoscopia',
  'UT': 'Ultrasuoni',
  'VT': 'Visivo',
  'PT': 'Liquidi Penetranti',
  'RT': 'Radiografia',
  'ET': 'Correnti Indotte',
  'LT': 'Perdite'
};

const levelLabels = {
  'Livello 1': 'Livello I',
  'Livello 2': 'Livello II',
  'Livello 3': 'Livello III'
};

const statusColors = {
  'active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'expired': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'suspended': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
};

const statusIcons = {
  'active': <CheckCircle className="h-4 w-4" />,
  'expired': <XCircle className="h-4 w-4" />,
  'suspended': <AlertTriangle className="h-4 w-4" />
};

export default function Qualifications() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQualification, setEditingQualification] = useState<QualificationWithOperator | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: qualifications = [], isLoading } = useQuery<QualificationWithOperator[]>({
    queryKey: ["/api/qualifications"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      operatorId: "",
      qualificationType: "MT" as const,
      level: "Livello 1" as const,
      certificationNumber: "",
      issuingBody: "",
      issueDate: "",
      expiryDate: "",
      status: "active" as const,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("/api/qualifications", "POST", {
        ...data,
        issueDate: new Date(data.issueDate).toISOString(),
        expiryDate: new Date(data.expiryDate).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qualifications"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Successo",
        description: "Qualifica creata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nella creazione della qualifica",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      return apiRequest(`/api/qualifications/${id}`, "PUT", {
        ...data,
        issueDate: new Date(data.issueDate).toISOString(),
        expiryDate: new Date(data.expiryDate).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qualifications"] });
      setIsDialogOpen(false);
      setEditingQualification(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Qualifica aggiornata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento della qualifica",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/qualifications/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qualifications"] });
      toast({
        title: "Successo",
        description: "Qualifica eliminata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione della qualifica",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (qualification: QualificationWithOperator) => {
    setEditingQualification(qualification);
    form.reset({
      operatorId: qualification.operatorId,
      qualificationType: qualification.qualificationType as "MT" | "UT" | "VT" | "PT" | "RT" | "ET" | "LT",
      level: qualification.level as "Livello 1" | "Livello 2" | "Livello 3",
      certificationNumber: qualification.certificationNumber || "",
      issuingBody: qualification.issuingBody,
      issueDate: format(new Date(qualification.issueDate), "yyyy-MM-dd"),
      expiryDate: format(new Date(qualification.expiryDate), "yyyy-MM-dd"),
      status: qualification.status as "active" | "expired" | "suspended",
      notes: qualification.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: FormData) => {
    if (editingQualification) {
      updateMutation.mutate({ id: editingQualification.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questa qualifica?")) {
      deleteMutation.mutate(id);
    }
  };

  const getQualificationStatus = (qualification: QualificationWithOperator) => {
    if (qualification.status === 'suspended') return 'suspended';
    if (isAfter(new Date(), new Date(qualification.expiryDate))) return 'expired';
    return 'active';
  };

  const getOperatorName = (operatorId: string) => {
    const operator = users.find((u: any) => u.id === operatorId);
    if (!operator) return 'Operatore sconosciuto';
    return `${operator.firstName || ''} ${operator.lastName || ''}`.trim() || operator.username;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Qualifiche Operatori</h2>
          <p className="text-muted-foreground">
            Gestione delle certificazioni e qualifiche degli operatori CND
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingQualification(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Qualifica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQualification ? "Modifica Qualifica" : "Nuova Qualifica"}
              </DialogTitle>
              <DialogDescription>
                {editingQualification 
                  ? "Modifica i dettagli della qualifica dell'operatore"
                  : "Aggiungi una nuova qualifica per un operatore"
                }
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="operatorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operatore</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona operatore" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users
                              .filter((user: any) => user.role === 'operator')
                              .map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="qualificationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Qualifica</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(qualificationTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Livello</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona livello" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(levelLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certificationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero Certificato</FormLabel>
                        <FormControl>
                          <Input placeholder="Es: MT-L2-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="issuingBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ente Certificatore</FormLabel>
                        <FormControl>
                          <Input placeholder="Es: ACCREDIA, RINA, ecc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Rilascio</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Scadenza</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stato</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Attiva</SelectItem>
                            <SelectItem value="expired">Scaduta</SelectItem>
                            <SelectItem value="suspended">Sospesa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Note aggiuntive sulla qualifica..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    )}
                    {editingQualification ? "Aggiorna" : "Crea"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualifiche Attive</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {qualifications.filter((q: QualificationWithOperator) => 
                getQualificationStatus(q) === 'active'
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Scadenza (30gg)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {qualifications.filter((q: QualificationWithOperator) => {
                const daysToExpiry = Math.ceil(
                  (new Date(q.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                return daysToExpiry <= 30 && daysToExpiry > 0;
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scadute</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {qualifications.filter((q: QualificationWithOperator) => 
                getQualificationStatus(q) === 'expired'
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Qualifiche</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualifications.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Qualifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Elenco Qualifiche</CardTitle>
          <CardDescription>
            Visualizza e gestisci tutte le qualifiche degli operatori
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operatore</TableHead>
                  <TableHead>Qualifica</TableHead>
                  <TableHead>Livello</TableHead>
                  <TableHead>Ente Certificatore</TableHead>
                  <TableHead>Numero Certificato</TableHead>
                  <TableHead>Data Scadenza</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qualifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Nessuna qualifica trovata</p>
                        <p className="text-sm text-muted-foreground">
                          Inizia aggiungendo la prima qualifica per un operatore
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  qualifications.map((qualification: QualificationWithOperator) => {
                    const status = getQualificationStatus(qualification);
                    const daysToExpiry = Math.ceil(
                      (new Date(qualification.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    
                    return (
                      <TableRow key={qualification.id}>
                        <TableCell className="font-medium">
                          {getOperatorName(qualification.operatorId)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {qualificationTypeLabels[qualification.qualificationType as keyof typeof qualificationTypeLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {levelLabels[qualification.level as keyof typeof levelLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>{qualification.issuingBody}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {qualification.certificationNumber || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={daysToExpiry <= 30 && daysToExpiry > 0 ? 'text-yellow-600 font-medium' : ''}>
                              {format(new Date(qualification.expiryDate), "dd/MM/yyyy", { locale: it })}
                            </span>
                            {daysToExpiry <= 30 && daysToExpiry > 0 && (
                              <span className="text-xs text-yellow-600">
                                {daysToExpiry} giorni rimanenti
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[status]}>
                            <div className="flex items-center space-x-1">
                              {statusIcons[status]}
                              <span>
                                {status === 'active' ? 'Attiva' : 
                                 status === 'expired' ? 'Scaduta' : 'Sospesa'}
                              </span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {qualification.documentPath && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/api/qualifications/${qualification.id}/download`, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(qualification)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(qualification.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}