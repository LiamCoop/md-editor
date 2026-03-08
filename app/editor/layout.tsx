import { AutomergeProvider } from "@/components/AutomergeProvider";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AutomergeProvider>{children}</AutomergeProvider>;
}
