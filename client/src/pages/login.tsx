import { useState, useEffect, useRef, useId } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Shield, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type Step = "email" | "otp";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [otpValue, setOtpValue] = useState("");
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const formId = useId();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (step === "otp") {
      setOtpValue("");
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const sendOtpMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", "/api/auth/send-otp", data);
      return res.json();
    },
    onSuccess: () => {
      setEmail(emailForm.getValues("email"));
      setOtpValue("");
      setStep("otp");
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(interval);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      toast({
        title: "Code sent",
        description: "Check your email for the verification code",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", data);
      return res.json();
    },
    onSuccess: (data) => {
      login(data.sessionId, data.user, data.needsRegistration);
      if (data.needsRegistration) {
        navigate("/register");
      } else {
        navigate("/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid code",
        description: error.message,
        variant: "destructive",
      });
      setOtpValue("");
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    },
  });

  const handleEmailSubmit = (data: z.infer<typeof emailSchema>) => {
    sendOtpMutation.mutate(data);
  };

  const handleOtpSubmit = () => {
    if (otpValue.length === 6) {
      verifyOtpMutation.mutate({ email, code: otpValue });
    }
  };

  const handleResend = () => {
    if (countdown === 0) {
      setOtpValue("");
      sendOtpMutation.mutate({ email });
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newValue = otpValue.split("");
    newValue[index] = value.slice(-1);
    const newOtp = newValue.join("").slice(0, 6);
    setOtpValue(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newOtp.length === 6) {
      verifyOtpMutation.mutate({ email, code: newOtp });
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValue[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      setOtpValue(pastedData);
      if (pastedData.length === 6) {
        verifyOtpMutation.mutate({ email, code: pastedData });
      } else {
        otpInputRefs.current[pastedData.length]?.focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-app-title">
            PlagiarismGuard
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered plagiarism detection for academic integrity
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            {step === "email" ? (
              <>
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>
                  Enter your email to sign in or create an account
                </CardDescription>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setStep("email");
                      setOtpValue("");
                    }}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle className="text-xl">Check your email</CardTitle>
                </div>
                <CardDescription>
                  We sent a verification code to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {step === "email" ? (
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="you@example.com"
                              className="pl-10"
                              data-testid="input-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={sendOtpMutation.isPending}
                    data-testid="button-continue"
                  >
                    {sendOtpMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending code...
                      </>
                    ) : (
                      "Continue with Email"
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-6">
                <input
                  type="text"
                  name={`fake-username-${formId}`}
                  autoComplete="username"
                  style={{ position: "absolute", top: -9999, left: -9999, opacity: 0 }}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <input
                  type="password"
                  name={`fake-password-${formId}`}
                  autoComplete="current-password"
                  style={{ position: "absolute", top: -9999, left: -9999, opacity: 0 }}
                  tabIndex={-1}
                  aria-hidden="true"
                />

                <div className="flex flex-col items-center">
                  <label className="sr-only">Verification code</label>
                  <div 
                    className="flex gap-2"
                    onPaste={handleOtpPaste}
                    data-testid="input-otp"
                  >
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={otpValue[index] || ""}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-10 h-12 text-center text-lg font-semibold border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        name={`otp-${formId}-${index}-${Date.now()}`}
                        data-testid={`input-otp-${index}`}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  disabled={verifyOtpMutation.isPending || otpValue.length !== 6}
                  onClick={handleOtpSubmit}
                  data-testid="button-verify"
                >
                  {verifyOtpMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verify Code
                    </>
                  )}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Didn't receive the code? </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="p-0 h-auto text-primary hover:text-primary/80"
                    disabled={countdown > 0 || sendOtpMutation.isPending}
                    onClick={handleResend}
                    data-testid="button-resend"
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
