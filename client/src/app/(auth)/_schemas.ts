import { z } from 'zod';

const email = z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, 'Nama minimal 3 karakter').max(80, 'Nama maksimal 80 karakter'),
    email,
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter')
      .regex(/[A-Za-z]/, 'Kata sandi harus mengandung huruf')
      .regex(/\d/, 'Kata sandi harus mengandung angka'),
    confirmPassword: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
    hasAgreed: z.boolean().refine((value) => value, {
      message: 'Kamu perlu menyetujui syarat & ketentuan',
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi kata sandi tidak sama',
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
