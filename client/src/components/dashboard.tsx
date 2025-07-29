import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, Briefcase, Users } from "lucide-react";
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
      value: isLoadingUserStats ? "..." : userStats?.todayHours?.toFixed(1) || "0.0",
      icon: Clock,
      color: "text-primary"
    },
    {
      title: "Ore Settimana",
      value: isLoadingUserStats ? "..." : userStats?.weekHours?.toFixed(1) || "0.0",
      icon: Calendar,
      color: "text-green-600"
    },
    {
      title: "Commesse Attive",
      value: isLoadingTeamStats ? "..." : teamStats?.activeJobs?.toString() || "0",
      icon: Briefcase,
      color: "text-orange-600"
    },
    ...(user.role !== 'operator' ? [{
      title: "Team Membri",
      value: isLoadingTeamStats ? "..." : teamStats?.totalMembers?.toString() || "0",
      icon: Users,
      color: "text-gray-600"
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          ) : recentHours && recentHours.length > 0 ? (
            <div className="space-y-4">
              {recentHours.slice(0, 5).map((entry: any) => (
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
