import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "./api/auth/authOptions";

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
        <Link
          href="/api/auth/signin?callbackUrl=%2Feditor"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Sign in with Microsoft
        </Link>
      </div>
    </div>
  );
}
