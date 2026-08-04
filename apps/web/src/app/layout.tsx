import type { Metadata } from "next";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AgentMesh",
    template: "%s · AgentMesh",
  },
  description:
    "Multi-tenant AI agent execution platform — durable queues, gRPC runtime, live SSE, RBAC, and ops controls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
