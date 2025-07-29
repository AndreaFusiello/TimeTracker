import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { UserPlus, Edit, UserX, Save, Trash2 } from "lucide-react";
import type { User } from "@shared/schema";

interface AdminPanelProps {
  user: User;
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [settings, setSettings] = useState({
    standardHours: 8,
    timezone: 'Europe/Rome',
    dailyReminders: true,
    weeklyBackup: false,
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PUT", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Ruolo utente aggiornato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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
        description: "Impossibile aggiornare il ruolo utente",
        variant: "destructive",
      });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Utente eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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
        description: "Impossibile eliminare l'utente",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserRole.mutate({ userId, role: newRole });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Sei sicuro di voler eliminare l'utente "${userName}"? Questa azione non può essere annullata e verranno eliminate anche tutte le sue ore lavorative.`)) {
      deleteUser.mutate(userId);
    }
  };

  const handleSaveSettings = () => {
    // Settings would be saved to the server
    toast({
      title: "Successo",
      description: "Impostazioni salvate con successo",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'team_leader':
        return 'default';
      case 'operator':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Amministratore';
      case 'team_leader':
        return 'Caposquadra';
      case 'operator':
        return 'Operatore';
      default:
        return role;
    }
  };

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || "Utente";
  };

  return (
    <div className="space-y-6">
      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Gestione Utenti</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Amministra utenti e loro permessi</p>
            </div>
            <Button className="mt-3 sm:mt-0">
              <UserPlus className="mr-2 h-4 w-4" />
              Nuovo Utente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Caricamento...</p>
            </div>
          ) : users && users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Ultimo Accesso</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userItem: User) => (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                              <span className="text-primary font-medium text-sm">
                                {getUserInitials(userItem)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {getUserDisplayName(userItem)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{userItem.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(userItem.role)}>
                          {getRoleLabel(userItem.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {userItem.updatedAt 
                          ? new Date(userItem.updatedAt).toLocaleDateString('it-IT')
                          : 'Mai'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Attivo
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Select 
                            value={userItem.role} 
                            onValueChange={(newRole) => handleRoleChange(userItem.id, newRole)}
                            disabled={updateUserRole.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="operator">Operatore</SelectItem>
                              <SelectItem value="team_leader">Caposquadra</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(userItem.id, getUserDisplayName(userItem))}
                            className="text-destructive hover:text-destructive"
                            disabled={userItem.id === user.id || deleteUser.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Nessun utente trovato</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Impostazioni Sistema</CardTitle>
          <p className="text-sm text-gray-600">Configura parametri generali dell'applicazione</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ore Lavorative Giornaliere Standard
                </label>
                <Input
                  type="number"
                  value={settings.standardHours}
                  onChange={(e) => setSettings({ ...settings, standardHours: parseInt(e.target.value) })}
                  min="1"
                  max="24"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuso Orario
                </label>
                <Select 
                  value={settings.timezone} 
                  onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Rome">Europe/Rome (UTC+1)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Invio automatico promemoria giornalieri
                  </label>
                  <p className="text-sm text-gray-500">
                    Invia notifiche agli utenti per ricordare l'inserimento delle ore
                  </p>
                </div>
                <Switch
                  checked={settings.dailyReminders}
                  onCheckedChange={(checked) => setSettings({ ...settings, dailyReminders: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Backup automatico settimanale
                  </label>
                  <p className="text-sm text-gray-500">
                    Esegui backup automatico dei dati ogni settimana
                  </p>
                </div>
                <Switch
                  checked={settings.weeklyBackup}
                  onCheckedChange={(checked) => setSettings({ ...settings, weeklyBackup: checked })}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings}>
                <Save className="mr-2 h-4 w-4" />
                Salva Impostazioni
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
