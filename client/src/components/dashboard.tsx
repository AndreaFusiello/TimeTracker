import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, Briefcase, Users, TrendingUp } from "lucide-react";
import type { User } from "@shared/schema";

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const { data: userStats, isLoading: isLoadingUserStats } = useQuery({
    queryKey: ["/api/stats/user"],
  });

  const { data: teamStats, isLoading: isLoadingTeamStats } = useQuery({
    queryKey: ["/api/stats/team"],
    enabled: user.role === 'team_leader' || user.role === 'admin',
  });

  const { data: recentHours, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["/api/work-hours"],
  });

  const stats = [
    {
      title: "Ore Oggi",
      value: isLoadingUserStats ? "..." : (userStats as any)?.todayHours?.toFixed(1) || "0.0",
      icon: Clock,
      color: "text-primary"
    },
    {
      title: "Ore Settimana",
      value: isLoadingUserStats ? "..." : (userStats as any)?.weekHours?.toFixed(1) || "0.0",
      icon: Calendar,
      color: "text-green-600"
    },
    {
      title: "Ore Mensili",
      value: isLoadingUserStats ? "..." : (userStats as any)?.monthHours?.toFixed(1) || "0.0",
      icon: TrendingUp,
      color: "text-blue-600"
    },
    {
      title: "Commesse Attive",
      value: isLoadingTeamStats ? "..." : (teamStats as any)?.activeJobs?.toString() || "0",
      icon: Briefcase,
      color: "text-orange-600"
    },
    ...(user.role !== 'operator' ? [{
      title: "Team Membri",
      value: isLoadingTeamStats ? "..." : (teamStats as any)?.totalMembers?.toString() || "0",
      icon: Users,
      color: "text-gray-600"
    }] : [])
  ];

  const overtimeStats = [
    {
      title: "Straordinario Settimanale",
      subtitle: "Lun-Ven oltre 8h",
      value: isLoadingUserStats ? "..." : (userStats as any)?.overtimeWeekly?.toFixed(1) || "0.0",
      color: "text-yellow-600"
    },
    {
      title: "Straordinario Extra",
      subtitle: "Sabato",
      value: isLoadingUserStats ? "..." : (userStats as any)?.overtimeExtra?.toFixed(1) || "0.0",
      color: "text-orange-600"
    },
    {
      title: "Straordinario Festivo",
      subtitle: "Domenica e festività",
      value: isLoadingUserStats ? "..." : (userStats as any)?.overtimeHoliday?.toFixed(1) || "0.0",
      color: "text-red-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.title}</dt>
                    <dd className="text-lg font-medium text-gray-900">{stat.value}</dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overtime Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ore di Straordinario - Mese Corrente</CardTitle>
          <p className="text-sm text-gray-600">Categorizzazione delle ore straordinarie</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {overtimeStats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="bg-gray-50 rounded-lg p-4">
                  <dt className="text-sm font-medium text-gray-500 mb-1">{stat.title}</dt>
                  <dt className="text-xs text-gray-400 mb-2">{stat.subtitle}</dt>
                  <dd className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}h
                  </dd>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Totale Straordinari:</span>
              <span className="text-lg font-bold text-primary">
                {isLoadingUserStats ? "..." : 
                  (((userStats as any)?.overtimeWeekly || 0) + ((userStats as any)?.overtimeExtra || 0) + ((userStats as any)?.overtimeHoliday || 0)).toFixed(1)
                }h
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Attività Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRecent ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : recentHours && (recentHours as any).length > 0 ? (
            <div className="space-y-4">
              {(recentHours as any).slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        Inserimento ore - Commessa {entry.jobNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(entry.workDate).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.hoursWorked} ore
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">Nessuna attività recente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
