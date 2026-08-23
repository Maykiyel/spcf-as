// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { theme } from "@/config/theme";
import { ServiceActiveToggle } from "./service-active-toggle";
import { toggleServiceActive } from "../api/toggle-service-active";
import type { Service } from "@/api/services";

// Seam: the mutation call site's existing pattern — mock the queryClient
// used by the component, assert the invalidateQueries calls made after a
// successful mutation (mirroring how ["services"] would already be
// asserted here).

vi.mock("../api/toggle-service-active");

const mockToggleServiceActive = vi.mocked(toggleServiceActive);

const service: Service = {
  id: 5,
  name: "Parking Sticker",
  price: 200,
  description: null,
  is_active: false,
};

function renderToggle(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <ServiceActiveToggle service={service} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("ServiceActiveToggle", () => {
  beforeEach(() => {
    mockToggleServiceActive.mockReset();
  });

  it("invalidates the transaction fee catalog in addition to services", async () => {
    mockToggleServiceActive.mockResolvedValue({ ...service, is_active: true });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderToggle(queryClient);

    fireEvent.click(
      screen.getByLabelText(`Toggle active status for ${service.name}`),
    );

    await waitFor(() => expect(mockToggleServiceActive).toHaveBeenCalled());

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["services"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["transactions", "fee-catalog"],
    });
  });
});
