import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Users, TrendingUp, DollarSign } from "lucide-react";
import type { User } from "@shared/schema";

export default function AdminSubscriptions() {
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const subscribedUsers = users?.filter(u => u.subscriptionPlan && u.subscriptionStatus === 'active') ?? [];
  const freeUsers = users?.filter(u => !u.subscriptionPlan || u.subscriptionStatus !== 'active') ?? [];
  
  const planCounts = subscribedUsers.reduce((acc, user) => {
    const plan = user.subscriptionPlan || 'Unknown';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    {
      title: "Active Subscriptions",
      value: subscribedUsers.length,
      icon: CreditCard,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Free Users",
      value: freeUsers.length,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Conversion Rate",
      value: users?.length ? `${((subscribedUsers.length / users.length) * 100).toFixed(1)}%` : "0%",
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-subscriptions-title">Subscription Management</h1>
        <p className="text-muted-foreground mt-1">Monitor and manage user subscriptions</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
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
                <div className="text-3xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Breakdown by subscription plan</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : Object.keys(planCounts).length === 0 ? (
              <p className="text-muted-foreground text-sm">No active subscriptions</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(planCounts).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <span className="font-medium">{plan}</span>
                    <Badge variant="secondary">{count} users</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Estimated monthly recurring revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">View detailed revenue in Stripe Dashboard</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {planCounts['Pro Plan'] || 0} Pro x $19.99 + {planCounts['Enterprise Plan'] || 0} Enterprise x $99.99
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscribed Users</CardTitle>
          <CardDescription>Users with active subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No active subscriptions
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscribedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.fullName || "Unnamed"}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{user.subscriptionPlan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                            {user.subscriptionStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
