'use client';

import { registerSchema, type RegisterInput } from '@studentos/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api-client';
import { useRegister } from '@/modules/auth/hooks/useRegister';

export function RegisterForm() {
  const register = useRegister();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((values) => {
    if (register.isPending) {
      return;
    }
    // Deliberately no field reset here (unlike LoginForm on failure) — T8.2
    // requires the form to stay filled after a server-side error like
    // "email already in use" so the user isn't forced to retype everything.
    register.mutate(values);
  });

  const serverError =
    register.error instanceof ApiClientError
      ? register.error.message
      : register.error
        ? 'Something went wrong. Please try again.'
        : null;

  const busy = isSubmitting || register.isPending;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {serverError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="register-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="register-name"
          type="text"
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? 'register-name-error' : undefined}
          {...registerField('name')}
        />
        {errors.name && (
          <p id="register-name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="register-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'register-email-error' : undefined}
          {...registerField('email')}
        />
        {errors.email && (
          <p id="register-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="register-password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? 'register-password-error' : undefined}
          {...registerField('password')}
        />
        {errors.password && (
          <p id="register-password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
