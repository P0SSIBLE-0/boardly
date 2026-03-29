"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { signInWithEmail, signUpWithEmail } from "@/lib/api";
import { normalizeRedirectTo } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function AuthCard({
  mode,
  redirectTo: initialRedirectTo,
}: {
  mode: AuthMode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const redirectTo = normalizeRedirectTo(initialRedirectTo);
  const isSignIn = mode === "sign-in";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      if (isSignIn) {
        await signInWithEmail({
          email,
          password,
          callbackURL: redirectTo,
        });
      } else {
        await signUpWithEmail({
          name,
          email,
          password,
          callbackURL: redirectTo,
        });
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "We could not complete that request.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/50 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="w-full max-w-[380px]"
      >
        <div className="rounded-xl border border-border bg-background p-8 shadow-sm">
          <Link
            href="/"
            className="inline-flex items-center text-[13px] font-medium text-muted-fg transition hover:text-foreground"
          >
            <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>

          <h1 className="mt-6 text-xl font-semibold tracking-tight text-foreground">
            {isSignIn ? "Welcome back" : "Create an account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-fg leading-relaxed">
            {isSignIn
              ? "Sign in to save boards and collaborate in realtime."
              : "Create an account to save your work permanently."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {!isSignIn ? (
              <div>
                <label
                  htmlFor="auth-name"
                  className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wider"
                >
                  Name
                </label>
                <input
                  id="auth-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  autoComplete="name"
                  className="h-10 w-full rounded-md border border-border bg-transparent px-3 text-[14px] text-foreground outline-none transition placeholder:text-subtle focus:border-foreground"
                  placeholder="Ada Lovelace"
                />
              </div>
            ) : null}

            <div>
              <label
                htmlFor="auth-email"
                className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="h-10 w-full rounded-md border border-border bg-transparent px-3 text-[14px] text-foreground outline-none transition placeholder:text-subtle focus:border-foreground"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete={isSignIn ? "current-password" : "new-password"}
                className="h-10 w-full rounded-md border border-border bg-transparent px-3 text-[14px] text-foreground outline-none transition placeholder:text-subtle focus:border-foreground"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-destructive-light px-3.5 py-3 text-sm text-red-700"
                role="alert"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </motion.div>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="relative mt-2 h-10 w-full rounded-md bg-foreground text-sm font-medium text-background transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-background" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                  </svg>
                  Working...
                </span>
              ) : isSignIn ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-fg">
            {isSignIn ? "Need an account?" : "Already have an account?"}{" "}
            <Link
              href={
                isSignIn
                  ? `/sign-up?redirectTo=${encodeURIComponent(redirectTo)}`
                  : `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
              }
              className="font-medium text-foreground transition hover:text-accent"
            >
              {isSignIn ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
