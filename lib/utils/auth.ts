import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Password is required.").max(128),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
    email: z.string().trim().email("Enter a valid email address.").max(254),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters.")
      .max(128, "Password must not exceed 128 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
    acceptedTerms: z.boolean().refine((value) => value, {
      message: "You must accept the terms to continue.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;