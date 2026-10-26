"use client";

import { useRouter } from "next/navigation";
import { Send, ShieldCheck, ShoppingBag } from "lucide-react";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { APP_CONFIG } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();

  const handleTelegramLogin = () => {
    router.push("/dashboard/orders");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="bg-primary text-primary-foreground mx-auto flex size-12 items-center justify-center rounded-xl shadow-sm">
            <ShoppingBag className="size-6" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">{APP_CONFIG.name}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Merchant portal for Telegram channel owners in Addis Ababa
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/40 text-muted-foreground space-y-2 rounded-lg border border-border p-4 text-xs">
            <div className="text-foreground flex items-center gap-1.5 font-medium">
              <ShieldCheck className="text-primary size-4" />
              <span>Zero-Touch Telegram Authentication</span>
            </div>
            <p>
              Sign in with your Telegram account to manage your channel inventory, fulfill orders, and monitor BirrJS
              payouts.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full gap-2 bg-[#229ED9] font-medium text-white hover:bg-[#1E88E5]"
              onClick={handleTelegramLogin}
            >
              <Send className="size-4" />
              <span>Log in with Telegram</span>
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Dev mode: tap above to enter dashboard with demo session
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
