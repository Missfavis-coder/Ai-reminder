"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Mail, Lock, EyeOff, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useLogin } from "@/lib/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/utils/error";

type InputChangeEvent = ChangeEvent<HTMLInputElement>;

export default function SigninPage() {
  const login = useLogin();
  const router = useRouter();

  const [payload, setPayload] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const isLoading = login.isPending;

  function handleOnChange(e: InputChangeEvent) {
    const { name, value } = e.target;

    setPayload((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!payload.email.trim() || !payload.password) {
      toast.error("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(payload.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    login.mutate(
      {
        email: payload.email.trim(),
        password: payload.password,
      },
      {
        onSuccess: () => {
          toast.success("Login successful!");
          router.push("/dashboard");
        },
        onError: (error) => {
            if (error instanceof ApiError && error.code === "USER_NOT_FOUND") {
              toast.error("No account found with this email. Please register first.");
              router.push("/register");
              return;
            }
          
            toast.error(getApiErrorMessage(error, "Unable to log in right now."));
          },
      },
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-primary">
      <div className="w-full flex items-center justify-center p-6 pt-24 lg:p-8">
        <div className="relative w-full max-w-md">
          <div className="relative mb-6">
            <h1 className="mb-3 text-2xl font-bold">Welcome Back</h1>
            <p className="text-sm text-neutral-500">
              Sign in to access your account.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mb-6 space-y-6"
            autoComplete="off"
          >
            <div className="space-y-4">
              <div className="group relative">
                <input
                  name="email"
                  type="email"
                  value={payload.email}
                  onChange={handleOnChange}
                  placeholder="Enter your email"
                  className="h-12 w-full rounded-xl border border-neutral-200 pl-12 pr-4 text-sm text-neutral-500 outline-none transition-all duration-200"
                  autoComplete="email"
                  required
                />
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-primary" />
              </div>

              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-primary" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={payload.password}
                  onChange={handleOnChange}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-neutral-200 pl-12 pr-12 text-sm text-gray-600 outline-none transition-all duration-200"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 transition-colors hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center space-x-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 bg-white accent-primary"
                  autoComplete="off"
                />
                <span className="text-neutral-700">Remember me</span>
              </label>

              <Link
                href="/forgot-password"
                className="cursor-pointer font-medium text-neutral-500 transition-colors hover:text-primary"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full transform items-center justify-center rounded-full bg-primary font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <p className="text-neutral-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="cursor-pointer font-semibold text-neutral-500 transition-colors hover:text-primary"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}