import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Save } from "lucide-react";
import type { User } from "@shared/schema";

interface HoursEntryFormProps {
  user: User;
}

const formSchema = z.object({
  workDate: z.string().min(1, "La data è obbligatoria"),
  jobNumber: z.string().min(1, "Il numero commessa è obbligatorio"),
  jobName: z.string().min(1, "Il nome commessa è obbligatorio"),
  activityType: z.enum([
    'NDE-MT/PT',
    'NDE-UT', 
    'RIP.NDE - MT/PT',
    'RIP.NDE - UT',
    'ISPEZIONE WI',
    'RIP.ISPEZIONE WI'
  ], { required_error: "Seleziona un tipo di attività" }),
  repairCompany: z.string().optional(),
  hoursWorked: z.string().min(1, "Le ore lavorate sono obbligatorie")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 24;
    }, "Inserisci un numero di ore valido (0-24)"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const activityTypes = [
  { value: 'NDE-MT/PT', label: 'NDE-MT/PT' },
  { value: 'NDE-UT', label: 'NDE-UT' },
  { value: 'RIP.NDE - MT/PT', label: 'RIP.NDE - MT/PT' },
  { value: 'RIP.NDE - UT', label: 'RIP.NDE - UT' },
  { value: 'ISPEZIONE WI', label: 'ISPEZIONE WI' },
  { value: 'RIP.ISPEZIONE WI', label: 'RIP.ISPEZIONE WI' },
];

export default function HoursEntryForm({ user }: HoursEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workDate: new Date().toISOString().split('T')[0],
      jobNumber: "",
      jobName: "",
      activityType: undefined,
      repairCompany: "",
      hoursWorked: "",
      notes: "",
    },
  });

  const createWorkHours = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        workDate: new Date(data.workDate).toISOString(),
        hoursWorked: data.hoursWorked,
      };
      await apiRequest("POST", "/api/work-hours", payload);
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Ore lavorative registrate con successo",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/work-hours"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/user"] });
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
        description: "Impossibile salvare le ore lavorative",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createWorkHours.mutate(data);
  };

  const operatorName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.email || "";

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Inserimento Ore Lavorative</CardTitle>
          <p className="text-sm text-gray-600">Compila tutti i campi per registrare le ore lavorate</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="workDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Nome Operatore</FormLabel>
                  <Input 
                    value={operatorName} 
                    readOnly 
                    className="bg-gray-50" 
                  />
                </div>

                <FormField
                  control={form.control}
                  name="jobNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero Commessa</FormLabel>
                      <FormControl>
                        <Input placeholder="es. C2024-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome/Acronimo Commessa</FormLabel>
                      <FormControl>
                        <Input placeholder="es. ISPEZIONE_PONTE_A1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo di Attività</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona tipo attività" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activityTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
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
                  name="repairCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ditta Riparazione</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome ditta che ha effettuato la riparazione" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hoursWorked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ore Lavorate</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          placeholder="8.0"
                          {...field}
                        />
                      </FormControl>
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
                    <FormLabel>Note Aggiuntive</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrivi dettagli dell'attività svolta, problemi riscontrati, etc."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => form.reset()}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createWorkHours.isPending}
                  className="bg-primary hover:bg-blue-700"
                >
                  {createWorkHours.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salva Ore
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
