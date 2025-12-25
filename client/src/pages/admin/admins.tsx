import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Crown, Shield, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import type { User } from "@shared/schema";

export default function AdminManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [promoteUser, setPromoteUser] = useState<User | null>(null);
  const [demoteUser, setDemoteUser] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: admins, isLoading: adminsLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/admins'],
  });

  const promoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('POST', `/api/admin/promote/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admins'] });
      toast({ title: "User promoted to admin" });
      setPromoteUser(null);
    },
    onError: () => {
      toast({ title: "Failed to promote user", variant: "destructive" });
    },
  });

  const demoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('POST', `/api/admin/demote/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admins'] });
      toast({ title: "Admin demoted to regular user" });
      setDemoteUser(null);
    },
    onError: () => {
      toast({ title: "Failed to demote admin", variant: "destructive" });
    },
  });

  const nonAdminUsers = users?.filter(u => !u.isAdmin) ?? [];

  if (!currentUser?.isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              Only super admins can access admin management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-admins-title">Admin Management</h1>
        <p className="text-muted-foreground mt-1">Manage administrator privileges</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Current Admins
            </CardTitle>
            <CardDescription>Users with administrative access</CardDescription>
          </CardHeader>
          <CardContent>
            {adminsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins?.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {admin.fullName || "Unnamed"}
                              {admin.isSuperAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                            </div>
                            <div className="text-sm text-muted-foreground">{admin.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={admin.isSuperAdmin ? "default" : "secondary"}>
                            {admin.isSuperAdmin ? "Super Admin" : "Admin"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!admin.isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDemoteUser(admin)}
                              data-testid={`button-demote-${admin.id}`}
                            >
                              <UserMinus className="w-4 h-4 mr-1" />
                              Demote
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              Promote User
            </CardTitle>
            <CardDescription>Grant admin access to regular users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : nonAdminUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No regular users available to promote
              </p>
            ) : (
              <div className="rounded-md border max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonAdminUsers.slice(0, 10).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.fullName || "Unnamed"}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPromoteUser(user)}
                            data-testid={`button-promote-${user.id}`}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Promote
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!promoteUser} onOpenChange={() => setPromoteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to promote <strong>{promoteUser?.fullName || promoteUser?.email}</strong> to admin?
              They will have access to all administrative features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => promoteUser && promoteMutation.mutate(promoteUser.id)}>
              Promote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!demoteUser} onOpenChange={() => setDemoteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove admin privileges from <strong>{demoteUser?.fullName || demoteUser?.email}</strong>?
              They will become a regular user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => demoteUser && demoteMutation.mutate(demoteUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Demote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
