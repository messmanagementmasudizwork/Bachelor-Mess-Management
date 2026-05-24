import { z } from "zod";
import type { Translations } from "@/lib/i18n";

type V = Translations["validation"];

export function createLoginSchema(v: V) {
  return z.object({
    email: z.string().min(1, v.emailRequired).email(v.emailInvalid),
    password: z.string().min(6, v.passwordMin6),
  });
}

export function createRegisterSchema(v: V) {
  return z
    .object({
      full_name: z.string().min(2, v.nameMin2).max(100, v.nameMax),
      email: z.string().min(1, v.emailRequired).email(v.emailInvalid),
      phone: z
        .string()
        .regex(/^(\+880|0)?1[3-9]\d{8}$/, v.phoneInvalid)
        .optional()
        .or(z.literal("")),
      password: z
        .string()
        .min(8, v.passwordMin8)
        .regex(/[A-Z]/, v.passwordUppercase)
        .regex(/[0-9]/, v.passwordNumber),
      confirm_password: z.string().min(1, v.passwordConfirm),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: v.passwordMismatch,
      path: ["confirm_password"],
    });
}

export function createForgotPasswordSchema(v: V) {
  return z.object({
    email: z.string().min(1, v.emailRequired).email(v.emailInvalid),
  });
}

export function createResetPasswordSchema(v: V) {
  return z
    .object({
      password: z
        .string()
        .min(8, v.passwordMin8)
        .regex(/[A-Z]/, v.passwordUppercase)
        .regex(/[0-9]/, v.passwordNumber),
      confirm_password: z.string().min(1, v.passwordConfirm),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: v.passwordMismatch,
      path: ["confirm_password"],
    });
}

export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;
export type ForgotPasswordInput = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
export type ResetPasswordInput = z.infer<ReturnType<typeof createResetPasswordSchema>>;
