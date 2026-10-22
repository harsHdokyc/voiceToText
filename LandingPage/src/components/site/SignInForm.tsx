import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/config";
import { signInError, type SignInMode } from "@/lib/sign-in";

export function SignInForm() {
  const [mode, setMode] = useState<SignInMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [resetDone, setResetDone] = useState(false);

  function changeMode(next: SignInMode) {
    setMode(next);
    setError("");
    setResetDone(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = signInError(mode, { email, password, name });
    setError(invalid ?? "");
    if (invalid) return;
    if (mode === "reset") {
      setResetDone(true);
      return;
    }
    window.location.assign(appUrl());
  }

  const title =
    mode === "signin" ? (
      <>
        Welcome <span className="italic text-primary">back.</span>
      </>
    ) : mode === "signup" ? (
      <>
        Make room for <span className="italic text-primary">ideas.</span>
      </>
    ) : (
      <>
        A fresh <span className="italic text-primary">start.</span>
      </>
    );

  const subtitle =
    mode === "signin"
      ? "Pick up where your thoughts left off."
      : mode === "signup"
        ? "A place for your thoughts to become next steps."
        : "Get back to what matters.";

  return (
    <div className="w-full max-w-md">
      <p className="eyebrow text-primary">Your next chapter</p>
      <h1 className="mt-4 text-4xl font-medium leading-tight md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-muted-foreground">{subtitle}</p>

      {mode !== "reset" ? (
        <div className="mt-6 grid grid-cols-2 border-b border-border">
          {(["signin", "signup"] as const).map((m) => (
            <Button
              key={m}
              variant="ghost"
              className={`h-12 rounded-none border-b-2 ${mode === m ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              onClick={() => changeMode(m)}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </Button>
          ))}
        </div>
      ) : null}

      {resetDone ? (
        <div className="mt-8 border-y border-border py-7" role="status">
          <Check className="h-7 w-7 text-primary" />
          <h2 className="mt-4 text-xl">Continue in the app.</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Password recovery lives in the Saydo app. Open it to reset your
            password.
          </p>
          <Button asChild variant="quiet" className="mt-5">
            <a href={appUrl()}>Open Saydo</a>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-7 space-y-5">
          {mode === "signup" ? (
            <label className="block">
              <span className="mb-2 block text-sm">Name</span>
              <input
                className="input-field"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-sm">Email</span>
            <input
              className="input-field"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode !== "reset" ? (
            <div>
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
                <label htmlFor="auth-password">Password</label>
                {mode === "signin" ? (
                  <Button
                    type="button"
                    variant="link"
                    className="min-h-11 p-0 text-sm"
                    onClick={() => changeMode("reset")}
                  >
                    Forgot password?
                  </Button>
                ) : null}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={show ? "text" : "password"}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  className="input-field pr-12"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="cta" size="xl" className="w-full">
            {mode === "reset" ? "Open reset in app" : "Continue to Saydo"}
            {mode === "reset" ? <Mail /> : <ArrowRight />}
          </Button>
          {mode === "signup" ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              By continuing, you acknowledge the{" "}
              <Link to="/terms" className="underline">
                draft terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline">
                privacy notice
              </Link>
              .
            </p>
          ) : null}
        </form>
      )}

      <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button asChild variant="quiet" size="xl" className="w-full">
        <Link to="/early-access">
          Request early access <ArrowRight />
        </Link>
      </Button>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Accounts live in the Saydo app. This page sends you there — the waitlist
        form is the path if you do not have access yet.
      </p>
      {mode === "reset" ? (
        <Button
          variant="link"
          className="mt-4 px-0"
          onClick={() => changeMode("signin")}
        >
          Back to sign in
        </Button>
      ) : null}
    </div>
  );
}
