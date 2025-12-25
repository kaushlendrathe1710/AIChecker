import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Crown, Zap, Building } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

type Price = {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  active: boolean;
  metadata: Record<string, string>;
};

type Product = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: Record<string, string>;
  prices: Price[];
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
    } else if (canceled === 'true') {
      toast({
        title: "Subscription canceled",
        description: "The checkout was canceled. You can try again anytime.",
        variant: "destructive",
      });
    }
  }, [success, canceled, toast]);

  const { data: productsData, isLoading: productsLoading } = useQuery<{ products: Product[] }>({
    queryKey: ['/api/subscription/products'],
  });

  const { data: statusData, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest('POST', '/api/subscription/checkout', { priceId });
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
        description: "Failed to start checkout. Please try again.",
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getPlanIcon = (name: string) => {
    if (name.toLowerCase().includes('enterprise')) return Building;
    if (name.toLowerCase().includes('pro')) return Crown;
    return Zap;
  };

  const getPlanFeatures = (metadata: Record<string, string>) => {
    const features = metadata?.features?.split(',').map(f => f.trim()) || [];
    return features;
  };

  if (productsLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const products = productsData?.products || [];
  const hasSubscription = statusData?.hasSubscription;
  const currentPlan = statusData?.plan;

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Subscription Plans</h1>
        <p className="text-muted-foreground">Choose the plan that works best for you</p>
      </div>

      {hasSubscription && (
        <Card className="mb-8 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Current Subscription
            </CardTitle>
            <CardDescription>
              You are currently on the <strong>{currentPlan || 'active'}</strong> plan
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-manage-subscription"
            >
              {portalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manage Subscription
            </Button>
          </CardFooter>
        </Card>
      )}

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No subscription plans available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Plans will appear here once they are configured.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const Icon = getPlanIcon(product.name);
            const features = getPlanFeatures(product.metadata);
            const monthlyPrice = product.prices.find(p => p.recurring?.interval === 'month');
            const yearlyPrice = product.prices.find(p => p.recurring?.interval === 'year');
            const isPro = product.name.toLowerCase().includes('pro');
            
            return (
              <Card 
                key={product.id} 
                className={`relative flex flex-col ${isPro ? 'border-primary shadow-lg' : ''}`}
                data-testid={`card-plan-${product.id}`}
              >
                {isPro && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle>{product.name}</CardTitle>
                  </div>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  {monthlyPrice && (
                    <div className="mb-4">
                      <span className="text-3xl font-bold">
                        {formatPrice(monthlyPrice.unit_amount, monthlyPrice.currency)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  )}
                  
                  {features.length > 0 && (
                    <ul className="space-y-2">
                      {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  {monthlyPrice && monthlyPrice.unit_amount > 0 && (
                    <Button
                      className="w-full"
                      variant={isPro ? "default" : "outline"}
                      onClick={() => checkoutMutation.mutate(monthlyPrice.id)}
                      disabled={checkoutMutation.isPending || hasSubscription}
                      data-testid={`button-subscribe-monthly-${product.id}`}
                    >
                      {checkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {hasSubscription ? 'Already subscribed' : 'Subscribe Monthly'}
                    </Button>
                  )}
                  {yearlyPrice && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => checkoutMutation.mutate(yearlyPrice.id)}
                      disabled={checkoutMutation.isPending || hasSubscription}
                      data-testid={`button-subscribe-yearly-${product.id}`}
                    >
                      {checkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Subscribe Yearly (Save 17%)
                    </Button>
                  )}
                  {monthlyPrice?.unit_amount === 0 && (
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled
                      data-testid={`button-free-${product.id}`}
                    >
                      Current Plan
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
