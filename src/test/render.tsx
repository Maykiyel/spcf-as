import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "@/config/theme";

// Most components under test use Mantine primitives (Button, Group, etc.),
// which throw without a MantineProvider ancestor — this wraps every
// render() call in one, with the app's actual theme, so component tests
// see the same tokens production does. Deliberately doesn't include the
// full AppProvider (QueryProvider/AuthProvider) — a component test for,
// say, FeeCatalogItemCard shouldn't implicitly depend on auth or a query
// client working.
function AllProviders({ children }: { children: ReactNode }) {
  return <MantineProvider theme={theme}>{children}</MantineProvider>;
}

function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// For components/contexts that call useQuery/useMutation (e.g.
// TransactionBuilderProvider). A fresh QueryClient per render, not a
// shared module-level one — tests must not leak cached query state into
// each other. retry is forced off regardless of the app's real
// queryConfig (src/lib/react-query/react-query.ts): a test asserting on a
// mocked rejection shouldn't have to also account for 2 retry attempts.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

// The same tree as renderWithQueryClient, exposed for renderHook, which
// takes a `wrapper`. Sharing it keeps hook and component tests agreeing
// about retry and cache isolation. The client is a defaulted parameter so
// a caller that needs to reach the cache can hold the same one.
function createQueryWrapper(queryClient: QueryClient = makeQueryClient()) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>{children}</MantineProvider>
      </QueryClientProvider>
    );
  };
}

// Returns the client alongside RTL's own result, so a test that needs to
// reach the cache — to seed an entry, or to assert something invalidated
// one — can do it without building and threading its own.
function renderWithQueryClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = makeQueryClient();
  return {
    ...render(ui, { wrapper: createQueryWrapper(queryClient), ...options }),
    queryClient,
  };
}

// Re-export everything from RTL so test files only need one import source.
export * from "@testing-library/react";
export {
  renderWithProviders as render,
  renderWithQueryClient,
  createQueryWrapper,
};
