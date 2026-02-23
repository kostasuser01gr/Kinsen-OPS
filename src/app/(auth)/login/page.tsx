"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handlePinInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      identifier: identifier.trim().toLowerCase(),
      pin,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials or account locked");
      setLoading(false);
    } else {
      router.push("/fleet");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Kinsen Ops Next</CardTitle>
          <CardDescription>Sign in with your staff ID and PIN</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {justRegistered && !error && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
                Account created! Sign in with your credentials.
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="identifier">Staff ID / Username</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="e.g. admin or nikos.g"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">4-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => handlePinInput(e.target.value)}
                className="text-center text-2xl tracking-[0.5em]"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || pin.length !== 4}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Need an account?{" "}
              <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
                Create one
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
