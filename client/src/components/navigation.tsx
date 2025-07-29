import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface NavigationProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  canAccessAdmin: boolean;
}

export default function Navigation({ user, activeTab, onTabChange, canAccessAdmin }: NavigationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Try local logout first, then Replit logout
      try {
        await apiRequest("POST", "/api/auth/logout-local", {});
      } catch (error) {
        // If local logout fails, try Replit logout
        window.location.href = "/api/logout";
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    },
    onError: () => {
      // Fallback to Replit logout
      window.location.href = "/api/logout";
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
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
    return user.username || user.email || "Utente";
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { id: 'hours-entry', label: 'Inserisci Ore', icon: 'fas fa-plus-circle' },
    { id: 'history', label: 'Storico', icon: 'fas fa-history' },
    { id: 'reports', label: 'Report', icon: 'fas fa-chart-bar' },
    ...(canAccessAdmin ? [{ id: 'admin', label: 'Amministrazione', icon: 'fas fa-users-cog' }] : [])
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-primary mr-3" />
            <span className="text-xl font-semibold text-gray-900">TimeTracker Pro</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{getUserDisplayName(user)}</span>
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary text-white text-sm">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } border-b-2 py-2 px-1 text-sm font-medium whitespace-nowrap`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </nav>
  );
}
