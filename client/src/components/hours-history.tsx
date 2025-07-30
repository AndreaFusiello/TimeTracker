import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Edit, Trash2, Search, Download, Save, X } from "lucide-react";
import type { User, WorkHoursWithUser } from "@shared/schema";

interface HoursHistoryProps {
  user: User;
}

const activityTypes = [
  'NDE-MT/PT',
  'NDE-UT', 
  'RIP.NDE - MT/PT',
  'RIP.NDE - UT',
  'ISPEZIONE WI',
  'RIP.ISPEZIONE WI',
  'DOCUMENTAZIONE'
];

export default function HoursHistory({ user }: HoursHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    activityType: "all",
    jobNumber: "",
    operatorId: "all",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    workDate: "",
    jobNumber: "",
    jobName: "",
    activityType: "",
    hoursWorked: "",
    notes: "",
  });

  const { data: workHours, isLoading } = useQuery({
    queryKey: ["/api/work-hours", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.append(key, value);
      });
      const response = await fetch(`/api/work-hours?${params}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const { data: operators } = useQuery({
    queryKey: ["/api/users"],
    enabled: user.role === 'admin',
  });

  const deleteHours = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/work-hours/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Registro ore eliminato con successo",
      });
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
        description: "Impossibile eliminare il registro ore",
        variant: "destructive",
      });
    },
  });

  const updateHours = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PUT", `/api/work-hours/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Ore lavorative aggiornate con successo",
      });
      setEditingId(null);
      // Reset form
      setEditForm({
        workDate: "",
        jobNumber: "",
        jobName: "",
        activityType: "",
        hoursWorked: "",
        notes: "",
      });
      // Force refresh of data
      queryClient.invalidateQueries({ queryKey: ["/api/work-hours"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/team"] });
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
        description: "Impossibile aggiornare le ore lavorative",
        variant: "destructive",
      });
    },
  });

  const handleFilter = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/work-hours"] });
  };

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setEditForm({
      workDate: new Date(entry.workDate).toISOString().split('T')[0], // Format for date input
      jobNumber: entry.jobNumber,
      jobName: entry.jobName || "",
      activityType: entry.activityType,
      hoursWorked: entry.hoursWorked.toString(),
      notes: entry.notes || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      workDate: "",
      jobNumber: "",
      jobName: "",
      activityType: "",
      hoursWorked: "",
      notes: "",
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    updateHours.mutate({
      id: editingId,
      data: {
        workDate: editForm.workDate,
        jobNumber: editForm.jobNumber,
        jobName: editForm.jobName,
        activityType: editForm.activityType,
        hoursWorked: parseFloat(editForm.hoursWorked),
        notes: editForm.notes,
      },
    });
  };

  const canEdit = (entry: WorkHoursWithUser) => {
    return user.role === 'admin' || user.role === 'team_leader' || entry.userId === user.id;
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.append(key, value);
      });
      
      const response = await fetch(`/api/export/csv?${params}`, { 
        credentials: "include" 
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ore-lavorative-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Successo",
        description: "Export completato con successo",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile esportare i dati",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questo registro ore?")) {
      deleteHours.mutate(id);
    }
  };

  const canDelete = (entry: WorkHoursWithUser) => {
    return user.role === 'admin' || entry.userId === user.id;
  };

  // Calculate summary by job number, module number and activity type
  const getHoursSummary = () => {
    if (!workHours || workHours.length === 0) return {};
    
    const summary: { [key: string]: { 
      jobName: string;
      modules: { [moduleNumber: string]: { [activity: string]: number } };
      totalHours: number;
    } } = {};
    
    workHours.forEach((entry: WorkHoursWithUser) => {
      const jobNumber = entry.jobNumber;
      const jobName = entry.jobName || entry.jobNumber;
      const activityType = entry.activityType;
      const hours = parseFloat(entry.hoursWorked.toString()) || 0;
      
      // Extract module number from job name (e.g., "MOD 93", "MOD 94")
      const moduleMatch = jobName?.match(/MOD\s*(\d+)/i);
      const moduleNumber = moduleMatch ? `MOD ${moduleMatch[1]}` : 'Altro';
      
      if (!summary[jobNumber]) {
        summary[jobNumber] = {
          jobName: jobName,
          modules: {},
          totalHours: 0
        };
      }
      
      if (!summary[jobNumber].modules[moduleNumber]) {
        summary[jobNumber].modules[moduleNumber] = {};
      }
      
      if (!summary[jobNumber].modules[moduleNumber][activityType]) {
        summary[jobNumber].modules[moduleNumber][activityType] = 0;
      }
      
      summary[jobNumber].modules[moduleNumber][activityType] += hours;
      summary[jobNumber].totalHours += hours;
    });
    
    return summary;
  };

  const hoursSummary = getHoursSummary();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Storico Ore Lavorative</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Visualizza e filtra le ore registrate</p>
          </div>
          <Button onClick={handleExport} className="mt-3 sm:mt-0">
            <Download className="mr-2 h-4 w-4" />
            Esporta
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            {user.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operatore</label>
                <Select 
                  value={filters.operatorId} 
                  onValueChange={(value) => setFilters({ ...filters, operatorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tutti gli operatori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli operatori</SelectItem>
                    {(operators || []).map((operator: any) => (
                      <SelectItem key={operator.id} value={operator.id}>
                        {operator.firstName && operator.lastName 
                          ? `${operator.firstName} ${operator.lastName}`
                          : operator.username || operator.email
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Attività</label>
              <Select 
                value={filters.activityType} 
                onValueChange={(value) => setFilters({ ...filters, activityType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le attività" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le attività</SelectItem>
                  {activityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleFilter}>
              <Search className="mr-2 h-4 w-4" />
              Filtra
            </Button>
          </div>
        </div>

        {/* Hours Summary */}
        {workHours && workHours.length > 0 && Object.keys(hoursSummary).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Riepilogo Ore per Commessa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(hoursSummary).map(([jobNumber, jobData]) => (
                  <div key={jobNumber} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-md mb-3 text-primary">
                      {jobData.jobName.replace(/MOD\s*\d+/gi, '').trim() || jobData.jobName}
                    </h4>
                    
                    {/* Modules breakdown - Horizontal scrollable */}
                    <div className="overflow-x-auto">
                      <div className="flex space-x-4 pb-2" style={{ minWidth: 'max-content' }}>
                        {Object.entries(jobData.modules).map(([moduleNumber, activities]) => (
                          <div key={moduleNumber} className="bg-gray-50 rounded-lg p-3 min-w-[280px] flex-shrink-0">
                            <h5 className="font-medium text-sm mb-2 text-gray-800 text-center">
                              {moduleNumber === 'Altro' ? 'Altri Lavori' : moduleNumber}
                            </h5>
                            <div className="space-y-2">
                              {Object.entries(activities).map(([activity, hours]) => (
                                <div key={activity} className="flex justify-between items-center p-2 bg-white rounded border">
                                  <span className="text-xs font-medium text-gray-700">
                                    {activity}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {hours.toFixed(1)}h
                                  </Badge>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-300">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-gray-700">Subtotale:</span>
                                <Badge variant="outline" className="text-primary border-primary text-xs">
                                  {Object.values(activities).reduce((sum: number, hours: number) => sum + hours, 0).toFixed(1)}h
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t-2 border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Totale Commessa:</span>
                        <Badge className="bg-primary text-white">
                          {jobData.totalHours.toFixed(1)}h
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Overall Total */}
                <div className="border-t-2 border-primary pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Totale Generale:</span>
                    <Badge className="bg-primary text-white text-lg px-4 py-2">
                      {Object.values(hoursSummary)
                        .reduce((total, jobData) => total + jobData.totalHours, 0)
                        .toFixed(1)}h
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Caricamento...</p>
            </div>
          ) : workHours && workHours.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Operatore</TableHead>
                  <TableHead>Commessa</TableHead>
                  <TableHead>Nome/Acronimo</TableHead>
                  <TableHead>Attività</TableHead>
                  <TableHead>Ore</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workHours.map((entry: WorkHoursWithUser) => (
                  <TableRow key={entry.id}>
                    {editingId === entry.id ? (
                      // Edit mode
                      <>
                        <TableCell>
                          <Input
                            type="date"
                            value={editForm.workDate}
                            onChange={(e) => setEditForm({ ...editForm, workDate: e.target.value })}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>{entry.operatorName}</TableCell>
                        <TableCell>
                          <Input
                            value={editForm.jobNumber}
                            onChange={(e) => setEditForm({ ...editForm, jobNumber: e.target.value })}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editForm.jobName || ''}
                            onChange={(e) => setEditForm({ ...editForm, jobName: e.target.value })}
                            className="w-full"
                            placeholder="Nome commessa"
                          />
                        </TableCell>

                        <TableCell>
                          <Select 
                            value={editForm.activityType} 
                            onValueChange={(value) => setEditForm({ ...editForm, activityType: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {activityTypes.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            value={editForm.hoursWorked}
                            onChange={(e) => setEditForm({ ...editForm, hoursWorked: e.target.value })}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            placeholder="Note opzionali..."
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={saveEdit}
                              disabled={updateHours.isPending}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      // View mode
                      <>
                        <TableCell>
                          {new Date(entry.workDate).toLocaleDateString('it-IT')}
                        </TableCell>
                        <TableCell>{entry.operatorName}</TableCell>
                        <TableCell>{entry.jobNumber}</TableCell>
                        <TableCell>{entry.jobName || '-'}</TableCell>
                        <TableCell>{entry.activityType}</TableCell>
                        <TableCell>{entry.hoursWorked}</TableCell>
                        <TableCell className="max-w-xs truncate" title={entry.notes || undefined}>
                          {entry.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {canEdit(entry) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(entry)}
                                className="text-primary hover:text-blue-900"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete(entry) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-900"
                                onClick={() => handleDelete(entry.id)}
                                disabled={deleteHours.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Nessun registro trovato</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
