import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Crown, Zap, Building } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import type { SubscriptionPlan } from "@shared/schema";

const CURRENCIES: Record<string, string> = {
  aed: "AED",
  usd: "$",
  eur: "\u20ac",
  gbp: "\u00a3",
  inr: "\u20b9",
  aud: "A$",
  cad: "C$",
  chf: "CHF",
  cny: "\u00a5",
  jpy: "\u00a5",
  sgd: "S$",
  hkd: "HK$",
  nzd: "NZ$",
  sek: "kr",
  nok: "kr",
  dkk: "kr",
  mxn: "$",
  brl: "R$",
  zar: "R",
  sar: "SAR",
};

type SubscriptionStatus = {
  hasSubscription: boolean;
  subscription: any;
  plan: string | null;
  status: string | null;
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (success === 'true') {
      toast({
        title: "Subscription activated",
        description: "Thank you for subscribing! Your account has been upgraded.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    } else if (canceled === 'true') {
      toast({
        title: "Checkout canceled",
        description: "The checkout was canceled. You can try again anytime.",
        variant: "destructive",
      });
    }
  }, [success, canceled, toast]);

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription/plans'],
  });

  const { data: statusData, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest('POST', '/api/subscription/checkout', { planId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/portal', {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (amount: number, currency: string) => {
    const symbol = CURRENCIES[currency.toLowerCase()] || currency.toUpperCase();
    return `${symbol} ${(amount / 100).toFixed(2)}`;
  };

  const formatInterval = (interval: string, intervalCount: number = 1) => {
    const unit = interval === 'year' ? 'year' : 'month';
    if (intervalCount === 1) {
      return unit;
    }
    return `${intervalCount} ${unit}s`;
  };

  const getPlanIcon = (name: string) => {
    if (name.toLowerCase().includes('enterprise') || name.toLowerCase().includes('business')) return Building;
    if (name.toLowerCase().includes('pro') || name.toLowerCase().includes('premium')) return Crown;
    return Zap;
  };

  const isCurrentPlan = (planName: string) => {
    return statusData?.hasSubscription && statusData.plan === planName && statusData.status === 'active';
  };

  if (plansLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-pricing-title">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select the plan that best fits your needs. All plans include access to our plagiarism detection platform.
        </p>
      </div>

      {statusData?.hasSubscription && statusData.status === 'active' && (
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">You're subscribed to <span className="text-primary">{statusData.plan}</span></p>
                  <p className="text-sm text-muted-foreground">Manage your subscription in the billing portal</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-subscription"
              >
                {portalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!plans?.length ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No subscription plans available at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.name);
            const isCurrent = isCurrentPlan(plan.name);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col ${isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Current Plan
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10 w-fit">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {plan.description && (
                    <CardDescription>{plan.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    {plan.priceAmount === 0 ? (
                      <div className="text-3xl font-bold">Free</div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold">
                          {formatPrice(plan.priceAmount, plan.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          per {formatInterval(plan.interval, plan.intervalCount)}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {plan.hasAiDetection && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">
                          {plan.monthlyScans === -1 ? 'Unlimited' : plan.monthlyScans} AI Detection scans/month
                        </span>
                      </div>
                    )}
                    {!plan.hasAiDetection && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <X className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">AI Detection</span>
                      </div>
                    )}
                    
                    {plan.hasPlagiarismCheck && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">
                          {plan.monthlyScans === -1 ? 'Unlimited' : plan.monthlyScans} Plagiarism scans/month
                        </span>
                      </div>
                    )}
                    {!plan.hasPlagiarismCheck && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <X className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Plagiarism Check</span>
                      </div>
                    )}
                    
                    {plan.hasGrammarCheck && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">
                          {plan.monthlyScans === -1 ? 'Unlimited' : plan.monthlyScans} Grammar checks/month
                        </span>
                      </div>
                    )}
                    {!plan.hasGrammarCheck && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <X className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Grammar Check</span>
                      </div>
                    )}
                    
                    {plan.hasApiAccess ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">API Access</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <X className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">API Access</span>
                      </div>
                    )}
                    
                    {plan.hasPrioritySupport ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">Priority Support</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <X className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Priority Support</span>
                      </div>
                    )}
                    
                    {plan.hasTeamManagement ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">Team Management</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <X className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Team Management</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  {isCurrent ? (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                      data-testid={`button-manage-${plan.id}`}
                    >
                      Manage Plan
                    </Button>
                  ) : plan.priceAmount === 0 ? (
                    <Button 
                      className="w-full" 
                      variant="secondary"
                      disabled
                      data-testid={`button-free-${plan.id}`}
                    >
                      Free Plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => checkoutMutation.mutate(plan.id)}
                      disabled={checkoutMutation.isPending || !user}
                      data-testid={`button-subscribe-${plan.id}`}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {user ? 'Subscribe Now' : 'Login to Subscribe'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
