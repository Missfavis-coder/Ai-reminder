"use client";

import { useState, type FormEvent } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useRegister } from "@/lib/hooks/use-auth";
import { registerSchema } from "@/lib/utils/auth";
import { ApiError } from "@/lib/api/types";
import { getApiErrorMessage } from "@/lib/utils/error";

export default function RegisterPage() {
  const register = useRegister();
  const router = useRouter();

  const [payload, setPayload] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const isLoading = register.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = registerSchema.safeParse({
      name: payload.fullName,
      email: payload.email,
      password: payload.password,
      confirmPassword: payload.confirmPassword,
      acceptedTerms,
    });

    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    register.mutate(
      {
        name: result.data.name,
        email: result.data.email.toLowerCase(),
        password: result.data.password,
      },
      {
        onSuccess: () => {
          toast.success("Account created successfully!");
          router.push("/dashboard");
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            toast.error(
              "An account with this email already exists. Please log in instead.",
            );
            return;
          }

          toast.error(
            getApiErrorMessage(error, "Unable to create your account. Please try again."),
          );
        },
      },
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex w-full flex-col items-center justify-center p-6 pt-24 lg:mt-2 lg:p-8">
        <div className="w-full max-w-md">
          <div className="relative mb-10">
            <h1 className="mb-2 text-2xl font-bold text-[#160a2a]/90">
              Signup.
            </h1>
            <p className="text-sm text-neutral-600">
              Create your account to access our seamless services.
            </p>
          </div>

          <form
            className="mb-8 space-y-6"
            autoComplete="off"
            onSubmit={handleSubmit}
          >
            <div className="space-y-4 text-[14px]">
              <div className="group relative">
                <input
                  type="text"
                  name="name"
                  placeholder="Full name"
                  value={payload.fullName}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-xl border border-neutral-200 pl-12 pr-4 text-sm text-neutral-500 outline-none transition-all duration-200"
                  maxLength={100}
                  autoComplete="name"
                  required
                />
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-primary" />
              </div>

              <div className="group relative">
                <input
                  name="email"
                  type="email"
                  value={payload.email}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
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
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-neutral-200 pl-12 pr-12 text-sm text-neutral-500 outline-none transition-all duration-200"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-primary" />
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={payload.confirmPassword}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Confirm your password"
                  className="h-12 w-full rounded-xl border border-neutral-200 pl-12 pr-12 text-sm text-neutral-600 outline-none transition-all duration-200"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 transition-colors hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="flex items-start space-x-2 text-sm">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) =>
                    setAcceptedTerms(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 cursor-pointer bg-white accent-primary"
                />
                <label htmlFor="acceptTerms" className="text-neutral-500">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="font-medium text-neutral-600 hover:text-primary"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-neutral-600 hover:text-primary"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 w-full transform items-center justify-center rounded-full bg-primary font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </button>
            </div>
          </form>

          <div className="mt-4 flex items-center justify-center gap-1 text-center text-sm">
            <p className="text-neutral-500">Already have an account?</p>
            <Link
              href="/login"
              className="font-semibold text-neutral-600 transition-colors hover:text-primary"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}