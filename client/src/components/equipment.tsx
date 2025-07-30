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
import { Plus, Edit2, Trash2, Wrench, Calendar, AlertTriangle } from "lucide-react";
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
});

export default function Equipment({ user }: EquipmentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

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
      internalSerialNumber: "",
      serialNumber: "",
      calibrationExpiry: "",
      assignedOperatorId: "",
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

  const onSubmit = (data: z.infer<typeof equipmentFormSchema>) => {
    const equipmentData: InsertEquipment = {
      ...data,
      calibrationExpiry: data.calibrationExpiry,
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
      internalSerialNumber: equipment.internalSerialNumber,
      serialNumber: equipment.serialNumber,
      calibrationExpiry: new Date(equipment.calibrationExpiry).toISOString().split('T')[0],
      assignedOperatorId: equipment.assignedOperatorId || "",
      status: equipment.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa attrezzatura?")) {
      deleteEquipmentMutation.mutate(id);
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
        return 'Giogo Magnetico';
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
          <p className="text-gray-600">Controlli non distruttivi - Attrezzature magnetiche</p>
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
                              <SelectItem value="magnetic_yoke">Giogo Magnetico</SelectItem>
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
                            <Input placeholder="es. Magnaflux, Parker..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              <SelectItem value="">Non assegnato</SelectItem>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>N. Serie Interno</TableHead>
                    <TableHead>N. Serie</TableHead>
                    <TableHead>Scadenza Calibrazione</TableHead>
                    <TableHead>Operatore Assegnato</TableHead>
                    <TableHead>Stato</TableHead>
                    {canManageEquipment && <TableHead>Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipmentList.map((equipment: Equipment) => (
                    <TableRow key={equipment.id}>
                      <TableCell>{getEquipmentTypeLabel(equipment.equipmentType)}</TableCell>
                      <TableCell className="font-medium">{equipment.brand}</TableCell>
                      <TableCell>{equipment.internalSerialNumber}</TableCell>
                      <TableCell>{equipment.serialNumber}</TableCell>
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
                      <TableCell>{getOperatorName(equipment.assignedOperatorId)}</TableCell>
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