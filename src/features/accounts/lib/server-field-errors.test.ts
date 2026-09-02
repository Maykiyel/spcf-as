import { describe, it, expect } from "vitest";
import { AxiosError } from "axios";
import { getServerFieldErrors } from "./server-field-errors";

// Seam: the pure function. The page test covers what a duplicate username
// looks like on screen; this covers the shapes that aren't worth rendering
// a whole page to reach.

function axiosErrorWith(status: number, data: unknown): AxiosError {
  const error = new AxiosError("Request failed");
  error.response = { status, data } as AxiosError["response"];
  return error;
}

describe("getServerFieldErrors", () => {
  it("takes the first message for each field", () => {
    const error = axiosErrorWith(422, {
      message: "The given data was invalid.",
      errors: {
        username: ["The username has already been taken.", "Second message."],
        email: ["The email has already been taken."],
      },
    });

    expect(getServerFieldErrors(error)).toEqual({
      username: "The username has already been taken.",
      email: "The email has already been taken.",
    });
  });

  it("returns nothing for a failure that carries no field bag", () => {
    expect(
      getServerFieldErrors(
        axiosErrorWith(422, {
          message: "User cannot be deleted because they have existing related records.",
        }),
      ),
    ).toEqual({});
    expect(getServerFieldErrors(axiosErrorWith(500, "Server Error"))).toEqual(
      {},
    );
    expect(getServerFieldErrors(new Error("Network down"))).toEqual({});
  });
});
