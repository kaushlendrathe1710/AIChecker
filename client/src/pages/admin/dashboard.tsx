import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, CreditCard, Activity, TrendingUp, Clock } from "lucide-react";

type SystemStats = {
  totalUsers: number;
  totalDocuments: number;
  totalScans: number;
  totalGrammarChecks: number;
  activeSessions: number;
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ['/api/admin/stats'],
  });

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      description: "Registered accounts",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Documents",
      value: stats?.totalDocuments ?? 0,
      description: "Uploaded files",
      icon: FileText,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Plagiarism Scans",
      value: stats?.totalScans ?? 0,
      description: "Completed analyses",
      icon: Activity,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Grammar Checks",
      value: stats?.totalGrammarChecks ?? 0,
      description: "Documents checked",
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Active Sessions",
      value: stats?.activeSessions ?? 0,
      description: "Currently online",
      icon: Clock,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-admin-dashboard-title">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your platform statistics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat, index) => (
          <Card key={index} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  {stat.value.toLocaleString()}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Use the sidebar navigation to access different management sections:
            </p>
            <ul className="text-sm space-y-1 mt-2">
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span><strong>User Management</strong> - View and manage user accounts</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span><strong>Subscriptions</strong> - Monitor subscription status</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span><strong>Documents</strong> - Browse uploaded documents</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Platform health overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <span className="text-sm text-green-500 font-medium">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">File Storage (S3)</span>
                <span className="text-sm text-green-500 font-medium">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Service</span>
                <span className="text-sm text-green-500 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Stripe Integration</span>
                <span className="text-sm text-green-500 font-medium">Connected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
