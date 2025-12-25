import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  FileText, 
  Shield, 
  Activity,
  Trash2,
  UserPlus,
  UserMinus,
  Search,
  Crown
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UserWithStats {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isVerified: boolean;
  createdAt: string;
  stats: {
    totalScans: number;
    avgScore: number;
    lastScan: string | null;
  };
}

interface AdminDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  createdAt: string;
  userEmail: string;
  userName: string | null;
}

interface SystemStats {
  totalUsers: number;
  totalDocuments: number;
  totalScans: number;
  totalGrammarChecks: number;
  activeSessions: number;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [removeAdminId, setRemoveAdminId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: UserWithStats[] }>({
    queryKey: ["/api/admin/users"],
  });

  const { data: adminsData, isLoading: adminsLoading } = useQuery<{ admins: UserWithStats[] }>({
    queryKey: ["/api/admin/admins"],
  });

  const { data: docsData, isLoading: docsLoading } = useQuery<{ documents: AdminDocument[] }>({
    queryKey: ["/api/admin/documents"],
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const makeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", "/api/admin/admins", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      toast({ title: "Admin created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/admins/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      toast({ title: "Admin privileges removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredUsers = usersData?.users?.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You need admin privileges to access this panel.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-title">Admin Panel</h1>
          <p className="text-muted-foreground">
            {user.isSuperAdmin ? "Super Admin" : "Admin"} - Manage users and monitor system
          </p>
        </div>
        {user.isSuperAdmin && (
          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
            <Crown className="w-3 h-3 mr-1" />
            Super Admin
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {statsLoading ? "..." : stats?.totalUsers ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-documents">
              {statsLoading ? "..." : stats?.totalDocuments ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plagiarism Scans</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-scans">
              {statsLoading ? "..." : stats?.totalScans ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grammar Checks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-grammar">
              {statsLoading ? "..." : stats?.totalGrammarChecks ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-sessions">
              {statsLoading ? "..." : stats?.activeSessions ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="admins" data-testid="tab-admins">
            <Shield className="w-4 h-4 mr-2" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
          </div>

          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : (
            <div className="space-y-2">
              {filteredUsers?.map((u) => (
                <Card key={u.id} data-testid={`card-user-${u.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{u.fullName || "No name"}</span>
                          {u.isSuperAdmin && (
                            <Badge variant="default" className="bg-amber-500">
                              <Crown className="w-3 h-3 mr-1" />
                              Super Admin
                            </Badge>
                          )}
                          {u.isAdmin && !u.isSuperAdmin && (
                            <Badge variant="secondary">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>Role: {u.role}</span>
                          <span>Scans: {u.stats.totalScans}</span>
                          <span>Avg Score: {u.stats.avgScore.toFixed(1)}%</span>
                          <span>Joined: {format(new Date(u.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.isSuperAdmin && !u.isAdmin && !u.isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => makeAdminMutation.mutate(u.id)}
                            disabled={makeAdminMutation.isPending}
                            data-testid={`button-make-admin-${u.id}`}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Make Admin
                          </Button>
                        )}
                        {!u.isSuperAdmin && (user.isSuperAdmin || !u.isAdmin) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteUserId(u.id)}
                            data-testid={`button-delete-user-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredUsers?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No users found</div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          {adminsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading admins...</div>
          ) : (
            <div className="space-y-2">
              {adminsData?.admins?.map((admin) => (
                <Card key={admin.id} data-testid={`card-admin-${admin.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{admin.fullName || "No name"}</span>
                          {admin.isSuperAdmin && (
                            <Badge variant="default" className="bg-amber-500">
                              <Crown className="w-3 h-3 mr-1" />
                              Super Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Joined: {format(new Date(admin.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      {user.isSuperAdmin && !admin.isSuperAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRemoveAdminId(admin.id)}
                          data-testid={`button-remove-admin-${admin.id}`}
                        >
                          <UserMinus className="w-4 h-4 mr-1" />
                          Remove Admin
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {adminsData?.admins?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No admins found</div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {docsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
          ) : (
            <div className="space-y-2">
              {docsData?.documents?.map((doc) => (
                <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium truncate">{doc.fileName}</span>
                          <Badge variant={doc.status === "completed" ? "default" : "secondary"} className="text-xs">
                            {doc.status}
                          </Badge>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>By: {doc.userName || doc.userEmail}</span>
                          <span>Size: {(doc.fileSize / 1024).toFixed(1)} KB</span>
                          <span>Uploaded: {format(new Date(doc.createdAt), "MMM d, yyyy HH:mm")}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {docsData?.documents?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No documents found</div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will
              remove all their documents and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteUserId) {
                  deleteUserMutation.mutate(deleteUserId);
                  setDeleteUserId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removeAdminId} onOpenChange={() => setRemoveAdminId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Privileges</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove admin privileges from this user? They will become a
              regular user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-admin">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeAdminId) {
                  removeAdminMutation.mutate(removeAdminId);
                  setRemoveAdminId(null);
                }
              }}
              data-testid="button-confirm-remove-admin"
            >
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
