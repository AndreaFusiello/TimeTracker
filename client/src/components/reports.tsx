import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface ReportsProps {
  user: User;
}

export default function Reports({ user }: ReportsProps) {
  const { toast } = useToast();

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      let endpoint = '/api/export/csv';
      let mimeType = 'text/csv';
      let extension = 'csv';

      if (format === 'excel') {
        // For now, use CSV format (can be enhanced later)
        endpoint = '/api/export/csv';
        mimeType = 'text/csv';
        extension = 'csv';
      }

      const response = await fetch(endpoint, { 
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
      a.download = `ore-lavorative-${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Successo",
        description: `Export ${format.toUpperCase()} completato con successo`,
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: `Impossibile esportare in formato ${format.toUpperCase()}`,
        variant: "destructive",
      });
    }
  };

  const exportOptions = [
    {
      id: 'pdf',
      title: 'Report PDF',
      description: 'Riepilogo giornaliero o settimanale in formato PDF per archiviazione',
      icon: FileText,
      color: 'bg-red-500 hover:bg-red-600',
      disabled: true, // PDF export not implemented yet
    },
    {
      id: 'excel',
      title: 'Export Excel',
      description: 'Dati completi in formato Excel per analisi avanzate',
      icon: FileSpreadsheet,
      color: 'bg-green-500 hover:bg-green-600',
      disabled: false,
    },
    {
      id: 'csv',
      title: 'Export CSV',
      description: 'Formato CSV universale per backup e integrazione',
      icon: File,
      color: 'bg-blue-500 hover:bg-blue-600',
      disabled: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Esportazione Dati</CardTitle>
          <p className="text-sm text-gray-600">Genera report personalizzati per analisi e backup</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {exportOptions.map((option) => (
              <div 
                key={option.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center mb-3">
                  <option.icon className="h-8 w-8 text-gray-600 mr-3" />
                  <h4 className="text-lg font-medium text-gray-900">{option.title}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">{option.description}</p>
                <Button
                  onClick={() => handleExport(option.id as 'pdf' | 'excel' | 'csv')}
                  disabled={option.disabled}
                  className={`w-full text-white ${option.color} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {option.disabled ? 'In sviluppo' : `Genera ${option.title.split(' ')[1]}`}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analytics Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ore per Tipo di Attività</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">Grafico Distribuzione Attività</p>
                <p className="text-sm text-gray-400">Integrazione grafica in sviluppo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ore per Commessa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">Grafico Ore per Commessa</p>
                <p className="text-sm text-gray-400">Integrazione grafica in sviluppo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
