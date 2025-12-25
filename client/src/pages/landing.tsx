import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  FileSearch, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  FileText,
  Brain,
  SpellCheck,
  Users,
  Lock
} from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Plagiarism Detection",
    description: "Advanced algorithms scan your documents against billions of sources to detect copied content."
  },
  {
    icon: Brain,
    title: "AI Content Detection",
    description: "Identify AI-generated text with our cutting-edge detection technology powered by GPT-4."
  },
  {
    icon: SpellCheck,
    title: "Grammar Checking",
    description: "Get detailed grammar analysis and suggestions to improve your writing quality."
  },
  {
    icon: FileText,
    title: "Multiple Formats",
    description: "Upload PDF, DOCX, or TXT files. We handle the rest with seamless text extraction."
  },
  {
    icon: Lock,
    title: "Secure & Private",
    description: "Your documents are encrypted and never shared. We prioritize your privacy."
  },
  {
    icon: Zap,
    title: "Fast Results",
    description: "Get comprehensive reports in seconds, not minutes. Speed without compromising accuracy."
  }
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["5 scans per month", "Basic AI detection", "PDF & DOCX support"],
    highlighted: false
  },
  {
    name: "Pro",
    price: "$19.99",
    period: "per month",
    features: ["Unlimited scans", "Advanced AI detection", "Grammar checking", "Priority support"],
    highlighted: true
  },
  {
    name: "Enterprise",
    price: "$99.99",
    period: "per month",
    features: ["Everything in Pro", "API access", "Team management", "Dedicated support"],
    highlighted: false
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-xl" data-testid="text-brand-header">PlagiarismGuard</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" data-testid="button-login-header">Log in</Button>
            </Link>
            <Link href="/login">
              <Button data-testid="button-get-started-header">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-4">AI-Powered Academic Integrity</Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight" data-testid="text-hero-title">
            Protect Your Work with
            <span className="text-primary block mt-2">Advanced Plagiarism Detection</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Scan your documents for plagiarism and AI-generated content. Get detailed reports with source matches and originality scores in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="gap-2" data-testid="button-start-free">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" data-testid="button-learn-more">
              Learn More
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required. 5 free scans per month.
          </p>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-features-title">
              Everything You Need for Academic Integrity
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive suite of tools helps students, educators, and institutions maintain the highest standards.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 bg-background" data-testid={`card-feature-${index}`}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-pricing-title">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that works for you. Upgrade or downgrade anytime.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/login">
                    <Button 
                      className="w-full" 
                      variant={plan.highlighted ? "default" : "outline"}
                      data-testid={`button-choose-${plan.name.toLowerCase()}`}
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Trusted by Students & Educators
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of users who rely on PlagiarismGuard to maintain academic integrity and produce original work.
          </p>
          <Link href="/login">
            <Button size="lg" className="gap-2" data-testid="button-join-now">
              Join Now - It's Free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold">PlagiarismGuard</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PlagiarismGuard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
