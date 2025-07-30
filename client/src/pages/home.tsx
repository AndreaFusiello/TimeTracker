import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/navigation";
import Dashboard from "@/components/dashboard";
import HoursEntryForm from "@/components/hours-entry-form";
import HoursHistory from "@/components/hours-history";
import Reports from "@/components/reports";
import Equipment from "@/components/equipment";
import AdminPanel from "@/components/admin-panel";

type TabType = 'dashboard' | 'hours-entry' | 'history' | 'reports' | 'equipment' | 'admin';

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canAccessAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        user={user} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        canAccessAdmin={canAccessAdmin}
      />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && <Dashboard user={user} />}
        {activeTab === 'hours-entry' && <HoursEntryForm user={user} />}
        {activeTab === 'history' && <HoursHistory user={user} />}
        {activeTab === 'reports' && <Reports user={user} />}
        {activeTab === 'equipment' && <Equipment user={user} />}
        {activeTab === 'admin' && canAccessAdmin && <AdminPanel user={user} />}
      </div>
    </div>
  );
}
