"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "@/lib/api";
import { setSession } from "@/lib/sessionSlice";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

const DEMO_USERS = [
  "admin@agentmesh.local",
  "developer@agentmesh.local",
  "operator@agentmesh.local",
  "viewer@agentmesh.local",
];

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [login, { isLoading, error }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      email: "admin@agentmesh.local",
      password: "AgentMesh!Dev1",
    },
  });

  async function onSubmit(values: FormValues) {
    const parsed = schema.safeParse(values);
    if (!parsed.success) return;
    const result = await login(parsed.data).unwrap();
    dispatch(
      setSession({
        accessToken: result.access_token,
        userId: result.user_id,
        email: result.email,
        displayName: result.display_name,
        organizationId: result.organization_id,
        organizationName: result.organization_name,
        role: result.role,
      }),
    );
    router.push("/dashboard");
  }

  return (
    <main className="mesh-grid relative flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-accent-600">
          AgentMesh
        </p>
        <h1 className="font-display text-4xl font-semibold text-ink-950">Sign in</h1>
        <p className="mt-2 text-sm text-ink-700">
          Local demo login via Keycloak (fallback: free auth bypass). Password is
          development-only.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 space-y-4 rounded-lg border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur"
          noValidate
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-accent-500 focus:ring-2"
              aria-invalid={Boolean(errors.email)}
              {...register("email", { required: true })}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-accent-500 focus:ring-2"
              {...register("password", { required: true })}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              Login failed. Check credentials or API availability.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-sm text-ink-700">
          <p className="font-medium">Demo accounts</p>
          <ul className="mt-2 space-y-1">
            {DEMO_USERS.map((email) => (
              <li key={email}>
                <button
                  type="button"
                  className="text-accent-600 underline-offset-2 hover:underline"
                  onClick={() => {
                    setValue("email", email);
                    setValue("password", "AgentMesh!Dev1");
                  }}
                >
                  {email}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-500">
            Password: <code>AgentMesh!Dev1</code> (local only)
          </p>
        </div>

        <p className="mt-8 text-sm">
          <Link href="/" className="text-ink-700 underline-offset-2 hover:underline">
            ← Platform status
          </Link>
        </p>
      </div>
    </main>
  );
}
