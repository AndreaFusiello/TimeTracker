import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit2, Trash2, Wrench, Calendar, AlertTriangle, Upload, Download, Image, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertEquipmentSchema, type User, type Equipment, type InsertEquipment } from "@shared/schema";
import { z } from "zod";

interface EquipmentProps {
  user: User;
}

const equipmentFormSchema = insertEquipmentSchema.extend({
  calibrationExpiry: z.string().min(1, "La data di scadenza calibrazione è obbligatoria"),
  model: z.string().optional(),
  angle: z.string().optional(),
  frequency: z.string().optional(),
  dimension: z.string().optional(),
});

export default function Equipment({ user }: EquipmentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);

  const { data: equipmentList, isLoading } = useQuery({
    queryKey: ["/api/equipment"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: operators } = useQuery({
    queryKey: ["/api/users"],
    enabled: user.role === 'admin' || user.role === 'team_leader',
  });

  const form = useForm<z.infer<typeof equipmentFormSchema>>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      equipmentType: "magnetic_yoke",
      brand: "",
      model: "",
      internalSerialNumber: "",
      serialNumber: "",
      angle: "",
      frequency: "",
      dimension: "",
      calibrationExpiry: "",
      assignedOperatorId: "unassigned",
      status: "active",
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (data: InsertEquipment) => {
      return await apiRequest("POST", "/api/equipment", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Successo",
        description: "Attrezzatura aggiunta con successo",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Stai per essere reindirizzato alla pagina di login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Errore durante l'aggiunta dell'attrezzatura",
        variant: "destructive",
      });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEquipment> }) => {
      return await apiRequest("PUT", `/api/equipment/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Successo",
        description: "Attrezzatura aggiornata con successo",
      });
      setIsDialogOpen(false);
      setEditingEquipment(null);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Stai per essere reindirizzato alla pagina di login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento dell'attrezzatura",
        variant: "destructive",
      });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/equipment/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Successo",
        description: "Attrezzatura eliminata con successo",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Stai per essere reindirizzato alla pagina di login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Errore durante l'eliminazione dell'attrezzatura",
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ equipmentId, formData }: { equipmentId: string, formData: FormData }) => {
      const response = await fetch(`/api/equipment/${equipmentId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Successo",
        description: "File caricati con successo",
      });
      setUploadDialogOpen(false);
      setSelectedEquipment(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Stai per essere reindirizzato alla pagina di login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Errore durante il caricamento dei file",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof equipmentFormSchema>) => {
    const equipmentData: InsertEquipment = {
      ...data,
      calibrationExpiry: data.calibrationExpiry,
      assignedOperatorId: data.assignedOperatorId === "unassigned" ? null : data.assignedOperatorId,
    };

    if (editingEquipment) {
      updateEquipmentMutation.mutate({ id: editingEquipment.id, data: equipmentData });
    } else {
      createEquipmentMutation.mutate(equipmentData);
    }
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    form.reset({
      equipmentType: equipment.equipmentType,
      brand: equipment.brand,
      model: equipment.model || "",
      internalSerialNumber: equipment.internalSerialNumber,
      serialNumber: equipment.serialNumber,
      angle: equipment.angle || "",
      frequency: equipment.frequency || "",
      dimension: equipment.dimension || "",
      calibrationExpiry: new Date(equipment.calibrationExpiry).toISOString().split('T')[0],
      assignedOperatorId: equipment.assignedOperatorId || "unassigned",
      status: equipment.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa attrezzatura?")) {
      deleteEquipmentMutation.mutate(id);
    }
  };

  const handleUpload = (equipment: any) => {
    setSelectedEquipment(equipment);
    setUploadDialogOpen(true);
  };

  const handleFileUpload = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    if (selectedEquipment && (formData.get('calibrationCertificate') || formData.get('equipmentPhoto'))) {
      uploadFileMutation.mutate({ 
        equipmentId: selectedEquipment.id, 
        formData 
      });
    } else {
      toast({
        title: "Errore",
        description: "Seleziona almeno un file da caricare",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (equipmentId: string, fileType: 'certificate' | 'photo') => {
    try {
      const response = await fetch(`/api/equipment/${equipmentId}/download/${fileType}`);
      if (!response.ok) {
        throw new Error('File non trovato');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${fileType}-${equipmentId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile scaricare il file",
        variant: "destructive",
      });
    }
  };

  const getOperatorName = (operatorId: string | null) => {
    if (!operatorId || !operators || !Array.isArray(operators)) return "Non assegnato";
    const operator = operators.find((op: any) => op.id === operatorId);
    if (!operator) return "Non assegnato";
    return operator.firstName && operator.lastName 
      ? `${operator.firstName} ${operator.lastName}`
      : operator.username || operator.email;
  };

  const isCalibrationExpiring = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30; // Warning if expiring within 30 days
  };

  const getEquipmentTypeLabel = (type: string) => {
    switch (type) {
      case 'magnetic_yoke':
        return 'MT';
      case 'ultrasonic_instrument':
        return 'UT';
      case 'ut_probe':
        return 'UT Sonda';
      default:
        return type;
    }
  };

  const canManageEquipment = user.role === 'admin' || user.role === 'team_leader';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Attrezzature NDT</h1>
          <p className="text-gray-600">Controlli non distruttivi - Attrezzature MT, UT e Sonde</p>
        </div>
        {canManageEquipment && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingEquipment(null);
                  form.reset();
                }}
                className="bg-primary hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi Attrezzatura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEquipment ? "Modifica Attrezzatura" : "Aggiungi Nuova Attrezzatura"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="equipmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo Attrezzatura</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="magnetic_yoke">MT - Magnetoscopia</SelectItem>
                              <SelectItem value="ultrasonic_instrument">UT - Ultrasuoni</SelectItem>
                              <SelectItem value="ut_probe">UT Sonda</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Input placeholder="es. Magnaflux, Olympus, GE..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modello</FormLabel>
                          <FormControl>
                            <Input placeholder="es. 38DL PLUS, EPOCH 6LT, 5L64..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("equipmentType") === "ut_probe" && (
                      <>
                        <FormField
                          control={form.control}
                          name="angle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Angolo</FormLabel>
                              <FormControl>
                                <Input placeholder="es. 45°, 60°, 70°..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequenza</FormLabel>
                              <FormControl>
                                <Input placeholder="es. 2.25MHz, 5MHz..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dimension"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dimensione</FormLabel>
                              <FormControl>
                                <Input placeholder="es. 10mm, 20mm..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name="internalSerialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero di Serie Interno</FormLabel>
                          <FormControl>
                            <Input placeholder="es. YK001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero di Serie</FormLabel>
                          <FormControl>
                            <Input placeholder="Numero di serie del produttore" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="calibrationExpiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scadenza Calibrazione</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assignedOperatorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operatore Assegnato</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona operatore" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unassigned">Non assegnato</SelectItem>
                              {Array.isArray(operators) && operators.map((operator: any) => (
                                <SelectItem key={operator.id} value={operator.id}>
                                  {operator.firstName && operator.lastName 
                                    ? `${operator.firstName} ${operator.lastName}`
                                    : operator.username || operator.email
                                  }
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
                              <SelectItem value="active">Attivo</SelectItem>
                              <SelectItem value="maintenance">In Manutenzione</SelectItem>
                              <SelectItem value="retired">Dismesso</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingEquipment(null);
                        form.reset();
                      }}
                    >
                      Annulla
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createEquipmentMutation.isPending || updateEquipmentMutation.isPending}
                      className="bg-primary hover:bg-blue-700"
                    >
                      {createEquipmentMutation.isPending || updateEquipmentMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : null}
                      {editingEquipment ? "Aggiorna" : "Aggiungi"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}

        {/* File Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Carica File per {selectedEquipment?.brand} - {selectedEquipment?.internalSerialNumber}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="calibrationCertificate" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Certificato di Calibrazione (PDF)
                  </Label>
                  <Input
                    id="calibrationCertificate"
                    name="calibrationCertificate"
                    type="file"
                    accept=".pdf"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Formato supportato: PDF (max 10MB)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="equipmentPhoto" className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Foto dello Strumento
                  </Label>
                  <Input
                    id="equipmentPhoto"
                    name="equipmentPhoto"
                    type="file"
                    accept="image/*"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Formati supportati: JPG, PNG, GIF (max 10MB)
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    setSelectedEquipment(null);
                  }}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploadFileMutation.isPending}
                  className="bg-primary hover:bg-blue-700"
                >
                  {uploadFileMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : null}
                  Carica File
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wrench className="mr-2 h-5 w-5" />
            Attrezzature Disponibili
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : equipmentList && Array.isArray(equipmentList) && equipmentList.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MT/UT</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modello</TableHead>
                    <TableHead>N. Serie Interno</TableHead>
                    <TableHead>N. Serie</TableHead>
                    <TableHead>Angolo</TableHead>
                    <TableHead>Frequenza</TableHead>
                    <TableHead>Dimensione</TableHead>
                    <TableHead>Scadenza Calibrazione</TableHead>
                    <TableHead>Operatore Assegnato</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Certificato</TableHead>
                    <TableHead>Foto</TableHead>
                    {canManageEquipment && <TableHead>Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipmentList.map((equipment: any) => (
                    <TableRow key={equipment.id}>
                      <TableCell>{getEquipmentTypeLabel(equipment.equipmentType)}</TableCell>
                      <TableCell className="font-medium">{equipment.brand}</TableCell>
                      <TableCell>{equipment.model || '-'}</TableCell>
                      <TableCell>{equipment.internalSerialNumber}</TableCell>
                      <TableCell>{equipment.serialNumber}</TableCell>
                      <TableCell>{equipment.angle || '-'}</TableCell>
                      <TableCell>{equipment.frequency || '-'}</TableCell>
                      <TableCell>{equipment.dimension || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {isCalibrationExpiring(equipment.calibrationExpiry) && (
                            <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                          )}
                          <span className={isCalibrationExpiring(equipment.calibrationExpiry) ? "text-orange-600 font-medium" : ""}>
                            {new Date(equipment.calibrationExpiry).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {equipment.assignedOperator ? 
                          (equipment.assignedOperator.firstName && equipment.assignedOperator.lastName 
                            ? `${equipment.assignedOperator.firstName} ${equipment.assignedOperator.lastName}`
                            : equipment.assignedOperator.username) 
                          : "Non assegnato"}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          equipment.status === 'active' ? 'bg-green-100 text-green-800' :
                          equipment.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {equipment.status === 'active' ? 'Attivo' :
                           equipment.status === 'maintenance' ? 'In Manutenzione' : 'Dismesso'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {equipment.calibrationCertificate ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(equipment.id, 'certificate')}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">Non disponibile</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {equipment.equipmentPhoto ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(equipment.id, 'photo')}
                            className="flex items-center gap-1"
                          >
                            <Image className="h-3 w-3" />
                            Foto
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">Non disponibile</span>
                        )}
                      </TableCell>
                      {canManageEquipment && (
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(equipment)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpload(equipment)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            {user.role === 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(equipment.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Wrench className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">Nessuna attrezzatura trovata</p>
              {canManageEquipment && (
                <p className="text-sm">Aggiungi la prima attrezzatura cliccando il pulsante sopra</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}