import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit2, Trash2, FileText, Eye, EyeOff } from "lucide-react";
import { insertProcedureSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const procedureFormSchema = insertProcedureSchema.extend({
  approvedAt: z.string().optional(),
});

type ProcedureFormData = z.infer<typeof procedureFormSchema>;

export default function Procedures() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<any>(null);
  const [showSuperseded, setShowSuperseded] = useState(false);

  const form = useForm<ProcedureFormData>({
    resolver: zodResolver(procedureFormSchema),
    defaultValues: {
      jobNumber: "",
      procedureName: "",
      procedureCode: "",
      revision: "Rev. 0",
      isCurrentRevision: true,
      description: "",
      status: "draft",
      approvedById: "",
      approvedAt: "",
    },
  });

  // Fetch procedures
  const { data: procedures = [], isLoading } = useQuery({
    queryKey: ["/api/procedures"],
  });

  // Fetch users for approval selection
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Create procedure mutation
  const createProcedureMutation = useMutation({
    mutationFn: (data: ProcedureFormData) => 
      apiRequest("/api/procedures", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error creating procedure:", error);
    },
  });

  // Update procedure mutation
  const updateProcedureMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProcedureFormData> }) =>
      apiRequest(`/api/procedures/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
      setDialogOpen(false);
      setEditingProcedure(null);
      form.reset();
    },
  });

  // Delete procedure mutation
  const deleteProcedureMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/procedures/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
    },
  });

  const onSubmit = (data: ProcedureFormData) => {
    const procedureData = {
      ...data,
      approvedById: data.approvedById === "" ? undefined : data.approvedById,
      approvedAt: data.approvedAt && data.approvedById ? new Date().toISOString() : undefined,
    };

    if (editingProcedure) {
      updateProcedureMutation.mutate({ id: editingProcedure.id, data: procedureData });
    } else {
      createProcedureMutation.mutate(procedureData);
    }
  };

  const handleEdit = (procedure: any) => {
    setEditingProcedure(procedure);
    form.reset({
      jobNumber: procedure.jobNumber,
      procedureName: procedure.procedureName,
      procedureCode: procedure.procedureCode,
      revision: procedure.revision,
      isCurrentRevision: procedure.isCurrentRevision,
      description: procedure.description || "",
      status: procedure.status,
      approvedById: procedure.approvedBy?.id || "",
      approvedAt: procedure.approvedAt ? format(new Date(procedure.approvedAt), "yyyy-MM-dd") : "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteProcedureMutation.mutate(id);
  };

  const getStatusBadge = (status: string, isCurrentRevision: boolean) => {
    if (!isCurrentRevision) {
      return <Badge variant="secondary">Superata</Badge>;
    }
    
    switch (status) {
      case "draft":
        return <Badge variant="outline">Bozza</Badge>;
      case "approved":
        return <Badge variant="default">Approvata</Badge>;
      case "superseded":
        return <Badge variant="secondary">Superata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter procedures based on user role and superseded toggle
  const filteredProcedures = (procedures as any[]).filter((procedure: any) => {
    if ((user as any)?.role === 'operator') {
      return procedure.isCurrentRevision; // Operators see only current revisions
    }
    
    // Admins and team leaders see all, but can toggle superseded
    if (!showSuperseded && !procedure.isCurrentRevision) {
      return false;
    }
    
    return true;
  });

  const canManageProcedures = (user as any)?.role === 'admin' || (user as any)?.role === 'team_leader';

  if (isLoading) {
    return <div className="flex justify-center p-8">Caricamento procedure...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestione Procedure</h2>
          <p className="text-muted-foreground">
            Gestisci le procedure delle commesse con controllo delle revisioni
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Toggle for admins and team leaders to show superseded procedures */}
          {canManageProcedures && (
            <Button
              variant="outline"
              onClick={() => setShowSuperseded(!showSuperseded)}
              className="flex items-center gap-2"
            >
              {showSuperseded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showSuperseded ? "Nascondi Superate" : "Mostra Superate"}
            </Button>
          )}
          
          {canManageProcedures && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nuova Procedura
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingProcedure ? "Modifica Procedura" : "Nuova Procedura"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProcedure 
                      ? "Modifica i dettagli della procedura"
                      : "Crea una nuova procedura per una commessa"
                    }
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="jobNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numero Commessa</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="es. COM-2024-001" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="procedureCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Codice Procedura</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="es. PROC-MT-001" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="procedureName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Procedura</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="es. Controllo MT su saldature" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="revision"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Revisione</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Rev. 0" />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona stato" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Bozza</SelectItem>
                                <SelectItem value="approved">Approvata</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrizione</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Descrizione dettagliata della procedura..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="approvedById"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approvata da</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona approvatore" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={""}>Nessuno</SelectItem>
                              {(users as any[])
                                .filter((u: any) => u.role === 'admin' || u.role === 'team_leader')
                                .map((user: any) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.firstName && user.lastName 
                                      ? `${user.firstName} ${user.lastName}`
                                      : user.username
                                    }
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          setEditingProcedure(null);
                          form.reset();
                        }}
                      >
                        Annulla
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createProcedureMutation.isPending || updateProcedureMutation.isPending}
                      >
                        {editingProcedure ? "Aggiorna" : "Crea"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Procedures Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Elenco Procedure
            {(user as any)?.role === 'operator' && (
              <Badge variant="outline" className="ml-2">Solo revisioni correnti</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {filteredProcedures.length === 0 
              ? "Nessuna procedura trovata"
              : `${filteredProcedures.length} procedure trovate`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProcedures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commessa</TableHead>
                  <TableHead>Codice</TableHead>
                  <TableHead>Nome Procedura</TableHead>
                  <TableHead>Revisione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Creata da</TableHead>
                  <TableHead>Approvata da</TableHead>
                  <TableHead>Data Creazione</TableHead>
                  {canManageProcedures && <TableHead>Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcedures.map((procedure: any) => (
                  <TableRow key={procedure.id}>
                    <TableCell className="font-medium">{procedure.jobNumber}</TableCell>
                    <TableCell>{procedure.procedureCode}</TableCell>
                    <TableCell>{procedure.procedureName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {procedure.revision}
                        {procedure.isCurrentRevision && (
                          <Badge variant="outline">Corrente</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(procedure.status, procedure.isCurrentRevision)}
                    </TableCell>
                    <TableCell>
                      {procedure.createdBy.firstName && procedure.createdBy.lastName
                        ? `${procedure.createdBy.firstName} ${procedure.createdBy.lastName}`
                        : procedure.createdBy.username
                      }
                    </TableCell>
                    <TableCell>
                      {procedure.approvedBy ? (
                        <div>
                          {procedure.approvedBy.firstName && procedure.approvedBy.lastName
                            ? `${procedure.approvedBy.firstName} ${procedure.approvedBy.lastName}`
                            : procedure.approvedBy.username
                          }
                          {procedure.approvedAt && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(procedure.approvedAt), "dd/MM/yyyy", { locale: it })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Non approvata</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(procedure.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </TableCell>
                    {canManageProcedures && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(procedure)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {(user as any)?.role === 'admin' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Sei sicuro di voler eliminare la procedura "{procedure.procedureName}"?
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(procedure.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {canManageProcedures 
                ? "Nessuna procedura creata. Clicca su 'Nuova Procedura' per iniziare."
                : "Nessuna procedura disponibile."
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}