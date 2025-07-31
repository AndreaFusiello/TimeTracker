import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { UserPlus, Edit, UserX, Save, Trash2, Plus, X, Edit3, Check, XCircle } from "lucide-react";
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

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'operator' as 'operator' | 'team_leader' | 'admin',
  });
  const [editUserData, setEditUserData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'operator' as 'operator' | 'team_leader' | 'admin',
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

  const updateUser = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: any }) => {
      return await apiRequest("PUT", `/api/users/${userId}`, userData);
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Dati utente aggiornati con successo",
      });
      setEditingUser(null);
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
        description: "Impossibile aggiornare i dati utente",
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

  const createUser = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      await apiRequest("POST", "/api/users/create", userData);
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Nuovo utente creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowCreateUser(false);
      setNewUser({
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        email: '',
        role: 'operator',
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
        description: "Impossibile creare l'utente. Verifica che username e email non siano già in uso.",
        variant: "destructive",
      });
    },
  });

  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      await apiRequest("PUT", `/api/users/${userId}/status`, { enabled });
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Stato utente aggiornato con successo",
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
        description: "Impossibile aggiornare lo stato dell'utente",
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

  const handleToggleUserStatus = (userId: string, currentStatus: boolean, userName: string) => {
    const action = currentStatus ? 'disabilitare' : 'abilitare';
    if (confirm(`Sei sicuro di voler ${action} l'utente "${userName}"?`)) {
      updateUserStatus.mutate({ userId, enabled: !currentStatus });
    }
  };

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.password || !newUser.firstName || !newUser.lastName) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }
    createUser.mutate(newUser);
  };

  const resetCreateUserForm = () => {
    setNewUser({
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      role: 'operator',
    });
    setShowCreateUser(false);
  };

  const handleEditUser = (userItem: any) => {
    setEditingUser(userItem);
    setEditUserData({
      username: userItem.username || '',
      password: '', // Password is always empty for security
      firstName: userItem.firstName || '',
      lastName: userItem.lastName || '',
      email: userItem.email || '',
      role: userItem.role || 'operator',
    });
  };

  const handleSaveUser = () => {
    if (!editUserData.username || !editUserData.firstName || !editUserData.lastName) {
      toast({
        title: "Errore",
        description: "Username, nome e cognome sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      username: editUserData.username,
      firstName: editUserData.firstName,
      lastName: editUserData.lastName,
      email: editUserData.email,
      role: editUserData.role,
    };

    // Only include password if it's not empty
    if (editUserData.password.trim() !== '') {
      updateData.password = editUserData.password;
    }

    updateUser.mutate({ userId: editingUser.id, userData: updateData });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditUserData({
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      role: 'operator',
    });
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
            <Button 
              className="mt-3 sm:mt-0"
              onClick={() => setShowCreateUser(true)}
              disabled={showCreateUser}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Nuovo Utente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Create User Form */}
          {showCreateUser && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Crea Nuovo Utente</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetCreateUserForm}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Username per il login"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Password (min. 4 caratteri)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Nome"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Cognome"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email (opzionale)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@esempio.it"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Ruolo</Label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value as 'operator' | 'team_leader' | 'admin' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operator">Operatore</SelectItem>
                      <SelectItem value="team_leader">Caposquadra</SelectItem>
                      <SelectItem value="admin">Amministratore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  onClick={resetCreateUserForm}
                  disabled={createUser.isPending}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUser.isPending}
                >
                  {createUser.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creazione...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Crea Utente
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {isLoadingUsers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Caricamento...</p>
            </div>
          ) : users && Array.isArray(users) && users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Ultimo Accesso</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users as User[]).map((userItem: User) => 
                    editingUser?.id === userItem.id ? (
                      // Edit mode row
                      <TableRow key={userItem.id} className="bg-blue-50">
                        <TableCell>
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500 mb-1">Username</div>
                            <Input
                              value={editUserData.username}
                              onChange={(e) => setEditUserData(prev => ({ ...prev, username: e.target.value }))}
                              placeholder="Username"
                              className="text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Nome</div>
                                <Input
                                  value={editUserData.firstName}
                                  onChange={(e) => setEditUserData(prev => ({ ...prev, firstName: e.target.value }))}
                                  placeholder="Nome"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Cognome</div>
                                <Input
                                  value={editUserData.lastName}
                                  onChange={(e) => setEditUserData(prev => ({ ...prev, lastName: e.target.value }))}
                                  placeholder="Cognome"
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="email"
                            value={editUserData.email}
                            onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Email"
                            className="text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editUserData.role}
                            onValueChange={(value) => setEditUserData(prev => ({ ...prev, role: value as any }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="operator">Operatore</SelectItem>
                              <SelectItem value="team_leader">Caposquadra</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-xs text-gray-500">Nuova Password</div>
                            <Input
                              type="password"
                              value={editUserData.password}
                              onChange={(e) => setEditUserData(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="Lascia vuoto per non modificare"
                              className="text-sm"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSaveUser}
                              disabled={updateUser.isPending}
                              className="text-green-600 hover:text-green-700"
                              title="Salva modifiche"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={updateUser.isPending}
                              className="text-red-600 hover:text-red-700"
                              title="Annulla modifiche"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      // Normal view row
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
                              <div className="text-xs text-gray-500">
                                @{userItem.username}
                              </div>
                              <div className="text-xs">
                                <Badge variant={getRoleBadgeVariant(userItem.role)} className="text-xs">
                                  {getRoleLabel(userItem.role)}
                                </Badge>
                                {userItem.enabled === false && (
                                  <Badge variant="destructive" className="ml-1 text-xs">Disabilitato</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {userItem.email || <span className="text-gray-400">Non specificata</span>}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={userItem.role} 
                            onValueChange={(newRole) => handleRoleChange(userItem.id, newRole)}
                            disabled={updateUserRole.isPending || editingUser !== null}
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
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {userItem.updatedAt 
                            ? new Date(userItem.updatedAt).toLocaleDateString('it-IT')
                            : 'Mai'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(userItem)}
                              disabled={editingUser !== null}
                              className="text-blue-600 hover:text-blue-700"
                              title="Modifica utente"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            {userItem.id !== user.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(userItem.id, getUserDisplayName(userItem))}
                                className="text-destructive hover:text-destructive"
                                disabled={deleteUser.isPending || editingUser !== null}
                                title="Elimina utente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Switch
                              checked={userItem.enabled ?? true}
                              onCheckedChange={() => handleToggleUserStatus(userItem.id, userItem.enabled ?? true, getUserDisplayName(userItem))}
                              disabled={userItem.id === user.id || updateUserStatus.isPending || editingUser !== null}
                              title={userItem.enabled !== false ? 'Disabilita utente' : 'Abilita utente'}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}
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
