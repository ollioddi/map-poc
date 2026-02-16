import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/** Creates a per-request QueryClient injected into the TanStack Router context. */
export function getContext() {
	const queryClient = new QueryClient();
	return { queryClient };
}

/**
 * Client-side React Query provider rendered inside the root layout.
 * A stable QueryClient is created once via useState so it survives re-renders.
 */
export default function TanStackQueryProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [queryClient] = useState(() => new QueryClient());
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
