import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Format email tidak valid')
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'Password minimal 6 karakter')
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .max(255, 'Nama maksimal 255 karakter'),
  email: z
    .string()
    .email('Format email tidak valid')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf kecil, huruf besar, dan angka'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi password tidak sesuai',
  path: ['confirmPassword']
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token diperlukan')
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini diperlukan'),
  newPassword: z
    .string()
    .min(8, 'Password baru minimal 8 karakter')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf kecil, huruf besar, dan angka'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Konfirmasi password tidak sesuai',
  path: ['confirmPassword']
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Format email tidak valid')
    .toLowerCase()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token reset diperlukan'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf kecil, huruf besar, dan angka'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi password tidak sesuai',
  path: ['confirmPassword']
}); 