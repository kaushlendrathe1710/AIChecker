import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Trash2, Shield, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function AdminUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "User deleted successfully" });
      setDeleteUserId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  const filteredUsers = users?.filter(user => 
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-users-title">User Management</h1>
        <p className="text-muted-foreground mt-1">View and manage all registered users</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{users?.length ?? 0} total users</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.fullName || "Unnamed User"}
                              {user.isSuperAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                              {user.isAdmin && !user.isSuperAdmin && <Shield className="w-4 h-4 text-blue-500" />}
                            </div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === "teacher" ? "default" : "secondary"}>
                            {user.role || "user"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isVerified ? "default" : "outline"}>
                            {user.isVerified ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.subscriptionPlan ? (
                            <Badge variant="outline">{user.subscriptionPlan}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Free</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!user.isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUserId(user.id)}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
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

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
              All their documents and scan results will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
