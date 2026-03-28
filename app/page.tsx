import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  authOptions,
  isAzureAdConfigured,
  isGoogleConfigured,
} from "./api/auth/authOptions";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/editor");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-serif font-bold">Markdown Editor</h1>
        <p className="text-muted-foreground">
          Sign in to start collaborating.
        </p>
        <div className="flex flex-col gap-3">
          {isAzureAdConfigured ? (
            <Link
              href="/api/auth/signin/azure-ad?callbackUrl=%2Feditor"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Sign in with Microsoft
            </Link>
          ) : null}
          {isGoogleConfigured ? (
            <Link
              href="/api/auth/signin/google?callbackUrl=%2Feditor"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              Sign in with Google
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
