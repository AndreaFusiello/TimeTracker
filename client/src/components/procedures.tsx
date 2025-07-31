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
import { Plus, Edit2, Trash2, FileText, Eye, EyeOff, Upload, Download } from "lucide-react";
import { insertProcedureSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const procedureFormSchema = z.object({
  jobNumber: z.string().min(1, "Numero commessa richiesto"),
  procedureName: z.string().min(1, "Nome procedura richiesto"),
  procedureCode: z.string().min(1, "Codice procedura richiesto"),
  procedureType: z.enum(['UT', 'MT', 'VT', 'PT', 'RT', 'ET', 'LT']),
  revision: z.string().min(1, "Revisione richiesta"),
  description: z.string().optional(),
  status: z.enum(["draft", "approved"]).default("draft")
});

type ProcedureFormData = z.infer<typeof procedureFormSchema>;

export default function Procedures() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<any>(null);
  const [showSuperseded, setShowSuperseded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [canSubmit, setCanSubmit] = useState(false);

  const form = useForm<ProcedureFormData>({
    resolver: zodResolver(procedureFormSchema),
    defaultValues: {
      jobNumber: "",
      procedureName: "",
      procedureCode: "",
      procedureType: "UT" as const,
      revision: "Rev. 0",
      description: "",
      status: "draft",
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
      console.log("Procedure deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting procedure:", error);
      alert("Errore durante l'eliminazione della procedura. Verifica di avere i permessi necessari.");
    },
  });

  const onSubmit = async (data: ProcedureFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Selected file:", selectedFile);
    
    try {
      const procedureData = data;

      if (editingProcedure) {
        // For updates, handle file upload separately if needed
        if (selectedFile) {
          const formData = new FormData();
          formData.append('document', selectedFile);
          const uploadResponse = await fetch(`/api/procedures/${editingProcedure.id}/upload`, {
            method: 'POST',
            body: formData,
          });
          if (uploadResponse.ok) {
            const { documentPath } = await uploadResponse.json();
            (procedureData as any).documentPath = documentPath;
          }
        }
        updateProcedureMutation.mutate({ id: editingProcedure.id, data: procedureData });
      } else {
        // For new procedures, upload file first if selected
        if (selectedFile) {
          const formData = new FormData();  
          formData.append('document', selectedFile);
          Object.keys(procedureData).forEach(key => {
            const value = (procedureData as any)[key];
            if (value !== undefined) {
              formData.append(key, value);
            }
          });
          
          const response = await fetch('/api/procedures/create-with-file', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
            setDialogOpen(false);
            setEditingProcedure(null);
            form.reset();
            setSelectedFile(null);
          }
        } else {
          createProcedureMutation.mutate(procedureData);
        }
      }
    } catch (error) {
      console.error("Error submitting procedure:", error);
    }
  };

  const handleEdit = (procedure: any) => {
    setEditingProcedure(procedure);
    setSelectedFile(null); // Reset file selection
    
    // Reset form with existing procedure data
    const formData = {
      jobNumber: procedure.jobNumber || "",
      procedureName: procedure.procedureName || "",
      procedureCode: procedure.procedureCode || "",
      procedureType: procedure.procedureType || "UT",
      revision: procedure.revision || "Rev. 0",
      description: procedure.description || "",
      status: procedure.status || "draft",
    };
    
    console.log("Editing procedure data:", procedure);
    console.log("Form data being set:", formData);
    
    // Reset form and trigger validation
    form.reset(formData);
    
    // Enable submit for editing
    setCanSubmit(true);
    
    // Force validation after a delay
    setTimeout(() => {
      form.trigger();
      console.log("Form state after trigger:", form.formState);
      console.log("Form values after trigger:", form.getValues());
    }, 200);
    
    setDialogOpen(true);
  };

  const handleDownload = async (procedure: any) => {
    if (!procedure.documentPath) return;
    
    try {
      const response = await fetch(`/api/procedures/${procedure.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${procedure.procedureCode}_${procedure.revision}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading procedure:", error);
    }
  };

  const handleDelete = (id: string) => {
    console.log("Attempting to delete procedure with id:", id);
    console.log("Current user:", user);
    console.log("Current user role:", (user as any)?.role);
    console.log("Is admin?", (user as any)?.role === 'admin');
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

  // Filter procedures based on user role, superseded toggle, and search filters
  const filteredProcedures = (procedures as any[]).filter((procedure: any) => {
    if ((user as any)?.role === 'operator') {
      if (!procedure.isCurrentRevision) return false; // Operators see only current revisions
    } else {
      // Admins and team leaders see all, but can toggle superseded
      if (!showSuperseded && !procedure.isCurrentRevision) {
        return false;
      }
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        procedure.procedureCode?.toLowerCase().includes(searchLower) ||
        procedure.procedureName?.toLowerCase().includes(searchLower) ||
        procedure.jobNumber?.toLowerCase().includes(searchLower) ||
        procedure.description?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    // Apply status filter
    if (statusFilter !== "all" && procedure.status !== statusFilter) {
      return false;
    }
    
    // Apply type filter
    if (typeFilter !== "all" && procedure.procedureType !== typeFilter) {
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
                <Button 
                  className="flex items-center gap-2"
                  onClick={() => {
                    setEditingProcedure(null);
                    setCanSubmit(false);
                    setSelectedFile(null);
                    form.reset();
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Nuova Procedura
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                    console.log("Form validation errors:", errors);
                  })} className="space-y-4">
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
                      name="procedureType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipologia Procedura</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona tipologia" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="UT">UT - Ultrasuoni</SelectItem>
                              <SelectItem value="MT">MT - Magnetoscopia</SelectItem>
                              <SelectItem value="VT">VT - Visivo</SelectItem>
                              <SelectItem value="PT">PT - Liquidi Penetranti</SelectItem>
                              <SelectItem value="RT">RT - Radiografia</SelectItem>
                              <SelectItem value="ET">ET - Correnti Indotte</SelectItem>
                              <SelectItem value="LT">LT - Test di Tenuta</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="revision"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Revisione</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="es. Rev. 0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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



                    {/* File Upload Section */}
                    <div className="space-y-2">
                      <Label htmlFor="document">Documento Procedura (opzionale)</Label>
                      <Input
                        id="document"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      {selectedFile && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                          <Upload className="h-4 w-4 text-green-600" />
                          <p className="text-sm text-green-700">
                            File selezionato: {selectedFile.name}
                          </p>
                        </div>
                      )}
                      {editingProcedure?.documentPath && !selectedFile && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <p className="text-sm text-blue-700">
                            Documento esistente: {editingProcedure.documentPath.split('/').pop()}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Formati supportati: PDF, DOC, DOCX (max 10MB)
                      </p>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          setEditingProcedure(null);
                          setSelectedFile(null);
                          setCanSubmit(false);
                          form.reset();
                        }}
                      >
                        Annulla
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={
                          createProcedureMutation.isPending || 
                          updateProcedureMutation.isPending ||
                          (editingProcedure && !canSubmit) ||
                          (!editingProcedure && !form.formState.isValid)
                        }
                      >
                        {createProcedureMutation.isPending || updateProcedureMutation.isPending ? (
                          "Caricamento..."
                        ) : (
                          editingProcedure ? "Aggiorna" : "Crea"
                        )}
                      </Button>
                      {/* Debug info - remove in production */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                          <div>Form valid: {form.formState.isValid ? 'Si' : 'No'}</div>
                          <div>Errors: {Object.keys(form.formState.errors).length}</div>
                          {Object.keys(form.formState.errors).length > 0 && (
                            <div>
                              Errori: {Object.keys(form.formState.errors).join(', ')}
                            </div>
                          )}
                          <div>
                            Valori: {JSON.stringify(form.getValues(), null, 2)}
                          </div>
                        </div>
                      )}
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filtri di Ricerca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Ricerca</Label>
              <Input
                id="search"
                placeholder="Cerca per codice, nome, commessa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="type-filter">Tipologia</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Filtra per tipologia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le tipologie</SelectItem>
                  <SelectItem value="UT">UT - Ultrasuoni</SelectItem>
                  <SelectItem value="MT">MT - Magnetoscopia</SelectItem>
                  <SelectItem value="VT">VT - Visivo</SelectItem>
                  <SelectItem value="PT">PT - Liquidi Penetranti</SelectItem>
                  <SelectItem value="RT">RT - Radiografia</SelectItem>
                  <SelectItem value="ET">ET - Correnti Indotte</SelectItem>
                  <SelectItem value="LT">LT - Test di Tenuta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status-filter">Stato</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="draft">Bozza</SelectItem>
                  <SelectItem value="approved">Approvata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className="w-full"
              >
                Pulisci Filtri
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <TableHead>Tipologia</TableHead>
                  <TableHead>Revisione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Creata da</TableHead>
                  <TableHead>Approvata da</TableHead>
                  <TableHead>Data Creazione</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcedures.map((procedure: any) => (
                  <TableRow key={procedure.id}>
                    <TableCell className="font-medium">{procedure.jobNumber}</TableCell>
                    <TableCell>{procedure.procedureCode}</TableCell>
                    <TableCell>{procedure.procedureName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {procedure.procedureType}
                      </Badge>
                    </TableCell>
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
                      {procedure.documentPath ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(procedure)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Scarica
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">Nessun documento</span>
                      )}
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