// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { theme } from "@/config/theme";
import { ServiceForm } from "./service-form";
import { updateService } from "../api/update-service";
import { searchItemCodes } from "@/api/item-codes";
import type { Service } from "@/api/services";

// Seam: the mutation call sites' existing pattern — mock the queryClient
// used by the component, assert the invalidateQueries calls made after a
// successful mutation (mirroring the existing ["services"]/["item-codes"]
// assertions this call site would already have). Covers both
// createMutation and updateMutation since they share invalidateAndNotify;
// the update path is exercised directly since it needs no combobox
// interaction (edit mode pre-populates selection from editingService).

vi.mock("../api/update-service");
vi.mock("@/api/item-codes");

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

// jsdom also doesn't implement document.fonts (FontFaceSet), which the
// same autosize effect subscribes to for reflow-on-font-load.
if (!document.fonts) {
  Object.defineProperty(document, "fonts", {
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    configurable: true,
  });
}

const mockUpdateService = vi.mocked(updateService);
const mockSearchItemCodes = vi.mocked(searchItemCodes);

const editingService: Service = {
  id: 7,
  name: "Parking Sticker",
  price: 200,
  description: "Annual parking sticker",
  is_active: true,
  item_code: { id: 3, name: "PARKING" },
};

function renderForm(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <ServiceForm editingService={editingService} onDoneEditing={vi.fn()} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("ServiceForm", () => {
  beforeEach(() => {
    mockUpdateService.mockReset();
    mockSearchItemCodes.mockReset();
    mockSearchItemCodes.mockResolvedValue([]);
  });

  it("invalidates the transaction fee catalog in addition to services/item-codes on update", async () => {
    mockUpdateService.mockResolvedValue(editingService);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderForm(queryClient);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mockUpdateService).toHaveBeenCalled());

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["services"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["item-codes"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["transactions", "fee-catalog"],
    });
  });
});
