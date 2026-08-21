// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { FeeCatalogItemCard } from "./fee-catalog-item-card";
import type { FeeCatalogItem } from "../types";

const parkingFee: FeeCatalogItem = {
  id: 2,
  name: "Parking Sticker",
  description: null,
  price: 200,
  itemCode: "PARKING",
};

describe("FeeCatalogItemCard", () => {
  it("calls onAdd with the fee item when clicked", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<FeeCatalogItemCard item={parkingFee} onAdd={onAdd} />);

    await user.click(
      screen.getByRole("button", { name: /add parking sticker/i }),
    );

    expect(onAdd).toHaveBeenCalledExactlyOnceWith(parkingFee);
  });

  it("fires once per click on repeated clicks", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<FeeCatalogItemCard item={parkingFee} onAdd={onAdd} />);

    const card = screen.getByRole("button", { name: /add parking sticker/i });
    await user.click(card);
    await user.click(card);
    await user.click(card);

    expect(onAdd).toHaveBeenCalledTimes(3);
  });

  it("also fires onAdd when activated via keyboard (Enter)", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<FeeCatalogItemCard item={parkingFee} onAdd={onAdd} />);

    const card = screen.getByRole("button", { name: /add parking sticker/i });
    card.focus();
    await user.keyboard("{Enter}");

    expect(onAdd).toHaveBeenCalledExactlyOnceWith(parkingFee);
  });
});
