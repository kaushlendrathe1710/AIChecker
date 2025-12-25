import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CreditCard, Users, TrendingUp, Plus, Pencil, Trash2, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { User, SubscriptionPlan } from "@shared/schema";

const CURRENCIES = [
  { code: "aed", name: "UAE Dirham", symbol: "AED" },
  { code: "usd", name: "US Dollar", symbol: "$" },
  { code: "eur", name: "Euro", symbol: "\u20ac" },
  { code: "gbp", name: "British Pound", symbol: "\u00a3" },
  { code: "inr", name: "Indian Rupee", symbol: "\u20b9" },
  { code: "aud", name: "Australian Dollar", symbol: "A$" },
  { code: "cad", name: "Canadian Dollar", symbol: "C$" },
  { code: "chf", name: "Swiss Franc", symbol: "CHF" },
  { code: "cny", name: "Chinese Yuan", symbol: "\u00a5" },
  { code: "jpy", name: "Japanese Yen", symbol: "\u00a5" },
  { code: "sgd", name: "Singapore Dollar", symbol: "S$" },
  { code: "hkd", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "nzd", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "sek", name: "Swedish Krona", symbol: "kr" },
  { code: "nok", name: "Norwegian Krone", symbol: "kr" },
  { code: "dkk", name: "Danish Krone", symbol: "kr" },
  { code: "mxn", name: "Mexican Peso", symbol: "$" },
  { code: "brl", name: "Brazilian Real", symbol: "R$" },
  { code: "zar", name: "South African Rand", symbol: "R" },
  { code: "sar", name: "Saudi Riyal", symbol: "SAR" },
];

const planFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  stripePriceId: z.string().optional(),
  priceAmount: z.number().min(0),
  currency: z.string().default("aed"),
  interval: z.string().default("month"),
  intervalCount: z.number().min(1).default(1),
  monthlyScans: z.number().min(-1),
  hasAiDetection: z.boolean().default(true),
  hasPlagiarismCheck: z.boolean().default(true),
  hasGrammarCheck: z.boolean().default(false),
  hasApiAccess: z.boolean().default(false),
  hasTeamManagement: z.boolean().default(false),
  hasPrioritySupport: z.boolean().default(false),
  displayOrder: z.number().default(0),
});

type PlanFormData = z.infer<typeof planFormSchema>;

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [assignUserDialog, setAssignUserDialog] = useState<User | null>(null);
  const [selectedPlanForUser, setSelectedPlanForUser] = useState("");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/admin/plans'],
  });

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      description: "",
      stripePriceId: "",
      priceAmount: 0,
      currency: "aed",
      interval: "month",
      intervalCount: 1,
      monthlyScans: 5,
      hasAiDetection: true,
      hasPlagiarismCheck: true,
      hasGrammarCheck: false,
      hasApiAccess: false,
      hasTeamManagement: false,
      hasPrioritySupport: false,
      displayOrder: 0,
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const payload = {
        ...data,
        priceAmount: Math.round(data.priceAmount * 100),
      };
      await apiRequest('POST', '/api/admin/plans', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/plans'] });
      toast({ title: "Plan created successfully" });
      setShowPlanDialog(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create plan", variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PlanFormData> }) => {
      const payload = {
        ...data,
        priceAmount: data.priceAmount !== undefined ? Math.round(data.priceAmount * 100) : undefined,
      };
      await apiRequest('PATCH', `/api/admin/plans/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/plans'] });
      toast({ title: "Plan updated successfully" });
      setShowPlanDialog(false);
      setEditingPlan(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update plan", variant: "destructive" });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/plans'] });
      toast({ title: "Plan deleted successfully" });
      setDeletePlanId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete plan", variant: "destructive" });
    },
  });

  const assignSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, planName }: { userId: string; planName: string }) => {
      await apiRequest('POST', `/api/admin/users/${userId}/subscription`, { planName, status: "active" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Subscription assigned successfully" });
      setAssignUserDialog(null);
      setSelectedPlanForUser("");
    },
    onError: () => {
      toast({ title: "Failed to assign subscription", variant: "destructive" });
    },
  });

  const removeSubscriptionMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}/subscription`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Subscription removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove subscription", variant: "destructive" });
    },
  });

  const subscribedUsers = users?.filter(u => u.subscriptionPlan && u.subscriptionStatus === 'active') ?? [];
  const freeUsers = users?.filter(u => !u.subscriptionPlan || u.subscriptionStatus !== 'active') ?? [];

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      description: plan.description || "",
      stripePriceId: plan.stripePriceId || "",
      priceAmount: plan.priceAmount / 100,
      currency: plan.currency,
      interval: plan.interval,
      intervalCount: plan.intervalCount || 1,
      monthlyScans: plan.monthlyScans,
      hasAiDetection: plan.hasAiDetection,
      hasPlagiarismCheck: plan.hasPlagiarismCheck,
      hasGrammarCheck: plan.hasGrammarCheck,
      hasApiAccess: plan.hasApiAccess,
      hasTeamManagement: plan.hasTeamManagement,
      hasPrioritySupport: plan.hasPrioritySupport,
      displayOrder: plan.displayOrder,
    });
    setShowPlanDialog(true);
  };

  const handleCreateNew = () => {
    setEditingPlan(null);
    form.reset();
    setShowPlanDialog(true);
  };

  const onSubmit = (data: PlanFormData) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

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
        <p className="text-muted-foreground mt-1">Manage plans and user subscriptions</p>
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

      {currentUser?.isSuperAdmin && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Subscription Plans</CardTitle>
                <CardDescription>Create and manage subscription plans</CardDescription>
              </div>
              <Button onClick={handleCreateNew} className="gap-2" data-testid="button-create-plan">
                <Plus className="w-4 h-4" />
                Create Plan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {plansLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !plans?.length ? (
              <p className="text-muted-foreground text-center py-8">No subscription plans created yet</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Scans/Month</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>
                          {plan.priceAmount === 0 ? (
                            <span className="text-muted-foreground">Free</span>
                          ) : (
                            `${CURRENCIES.find(c => c.code === plan.currency)?.symbol || plan.currency.toUpperCase()} ${(plan.priceAmount / 100).toFixed(2)}/${plan.intervalCount > 1 ? `${plan.intervalCount} ${plan.interval}s` : plan.interval}`
                          )}
                        </TableCell>
                        <TableCell>
                          {plan.monthlyScans === -1 ? "Unlimited" : plan.monthlyScans}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {plan.hasAiDetection && <Badge variant="outline">AI</Badge>}
                            {plan.hasPlagiarismCheck && <Badge variant="outline">Plag</Badge>}
                            {plan.hasGrammarCheck && <Badge variant="outline">Grammar</Badge>}
                            {plan.hasApiAccess && <Badge variant="outline">API</Badge>}
                            {plan.hasPrioritySupport && <Badge variant="outline">Priority</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={plan.isActive ? "default" : "secondary"}>
                            {plan.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPlan(plan)}
                              data-testid={`button-edit-plan-${plan.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletePlanId(plan.id)}
                              data-testid={`button-delete-plan-${plan.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>User Subscriptions</CardTitle>
          <CardDescription>View and manage individual user subscriptions</CardDescription>
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
                    <TableHead>Current Plan</TableHead>
                    <TableHead>Status</TableHead>
                    {currentUser?.isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.slice(0, 20).map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-sub-${user.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.fullName || "Unnamed"}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.subscriptionPlan ? (
                          <Badge>{user.subscriptionPlan}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Free</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                          {user.subscriptionStatus || "none"}
                        </Badge>
                      </TableCell>
                      {currentUser?.isSuperAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAssignUserDialog(user)}
                              data-testid={`button-assign-sub-${user.id}`}
                            >
                              <UserCog className="w-4 h-4 mr-1" />
                              Assign
                            </Button>
                            {user.subscriptionPlan && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSubscriptionMutation.mutate(user.id)}
                                data-testid={`button-remove-sub-${user.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            <DialogDescription>
              {editingPlan ? "Update the subscription plan details" : "Add a new subscription plan"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Pro Plan" {...field} data-testid="input-plan-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Plan description" {...field} data-testid="input-plan-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (e.g., 19.99)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="19.99" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-plan-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-plan-currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.symbol} - {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="intervalCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <Select value={String(field.value)} onValueChange={(v) => field.onChange(parseInt(v))}>
                        <FormControl>
                          <SelectTrigger data-testid="select-plan-interval-count">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-plan-interval">
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="month">Month(s)</SelectItem>
                          <SelectItem value="year">Year(s)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="monthlyScans"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scans/Month (-1 = unlimited)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="5" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-plan-scans"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stripePriceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stripe Price ID (for payments)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="price_xxx..." 
                        {...field} 
                        data-testid="input-plan-stripe-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel>Features</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "hasAiDetection", label: "AI Detection" },
                    { name: "hasPlagiarismCheck", label: "Plag Check" },
                    { name: "hasGrammarCheck", label: "Grammar Check" },
                    { name: "hasApiAccess", label: "API Access" },
                    { name: "hasPrioritySupport", label: "Priority Support" },
                    { name: "hasTeamManagement", label: "Team Management" },
                  ].map((feature) => (
                    <FormField
                      key={feature.name}
                      control={form.control}
                      name={feature.name as any}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 text-sm font-normal">{feature.label}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowPlanDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                  data-testid="button-save-plan"
                >
                  {editingPlan ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignUserDialog} onOpenChange={() => setAssignUserDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Subscription</DialogTitle>
            <DialogDescription>
              Assign a subscription plan to {assignUserDialog?.fullName || assignUserDialog?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedPlanForUser} onValueChange={setSelectedPlanForUser}>
              <SelectTrigger data-testid="select-plan-for-user">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.name}>
                    {plan.name} - {plan.priceAmount === 0 ? "Free" : `$${(plan.priceAmount / 100).toFixed(2)}/${plan.interval}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignUserDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (assignUserDialog && selectedPlanForUser) {
                  assignSubscriptionMutation.mutate({
                    userId: assignUserDialog.id,
                    planName: selectedPlanForUser,
                  });
                }
              }}
              disabled={!selectedPlanForUser || assignSubscriptionMutation.isPending}
              data-testid="button-confirm-assign"
            >
              Assign Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subscription plan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePlanId && deletePlanMutation.mutate(deletePlanId)}
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
