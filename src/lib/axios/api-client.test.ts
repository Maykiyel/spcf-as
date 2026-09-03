import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, type AxiosResponse } from "axios";
import {
  handleResponseError,
  handleResponseSuccess,
  setAccountDeactivatedHandler,
  setUnauthorizedHandler,
} from "./api-client";

// Seam: the response interceptor as a unit, with the handlers the auth
// layer registers stubbed. There is no page involved — the whole point of
// this behaviour is that it applies to every endpoint at once, and testing
// it through one page would hide that.

/** The exact body `EnsureAccountIsActive` returns. Plain Laravel shape,
 * not the success envelope — see BACKEND_NOTES.md. */
const DEACTIVATED_MESSAGE =
  "User account is deactivated. Please ask admin to activate your account.";

/** What `POST /login` answers a deactivated user with. Same condition,
 * different controller, and one word different from the middleware's. */
const LOGIN_DEACTIVATED_MESSAGE =
  "User account is deactivated. Please ask an admin to activate your account.";

/** What a policy or role denial returns on the same status code. */
const PER_RECORD_MESSAGE =
  "You do not have permission to perform this action.";

/** An admin assigning a series receipt to a cashier who is switched off.
 * A 403 about somebody else's account being inactive, on the admin's own
 * working session — the nearest thing in this API to a false positive. */
const INACTIVE_CASHIER_MESSAGE =
  "Cannot assign Series Receipt to inactive cashier account";

function forbidden(message: string, url = "/users"): AxiosError {
  const error = new AxiosError(message);
  error.config = { url } as AxiosError["config"];
  error.response = {
    status: 403,
    data: { message },
  } as AxiosError["response"];
  return error;
}

function okResponse(): AxiosResponse {
  return {
    data: { success: true, data: {}, message: "OK", code: 200 },
  } as AxiosResponse;
}

describe("handleResponseError", () => {
  let onDeactivated: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onDeactivated = vi.fn();
    setAccountDeactivatedHandler(onDeactivated);
    setUnauthorizedHandler(vi.fn());
    // The once-only latch is module state. Clearing it through the same
    // path production does keeps these tests independent of each other
    // without reaching past the interceptor's own interface.
    handleResponseSuccess(okResponse());
  });

  it("reports a deactivated account with the server's own message", async () => {
    const error = forbidden(DEACTIVATED_MESSAGE);

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(onDeactivated).toHaveBeenCalledExactlyOnceWith(DEACTIVATED_MESSAGE);
  });

  it("reports it once however many requests were in flight", async () => {
    const rejections = [
      forbidden(DEACTIVATED_MESSAGE),
      forbidden(DEACTIVATED_MESSAGE),
      forbidden(DEACTIVATED_MESSAGE),
    ].map((error) => expect(handleResponseError(error)).rejects.toBe(error));

    await Promise.all(rejections);

    expect(onDeactivated).toHaveBeenCalledOnce();
  });

  it("reports it again after the session starts working", async () => {
    await expect(
      handleResponseError(forbidden(DEACTIVATED_MESSAGE)),
    ).rejects.toBeInstanceOf(AxiosError);

    handleResponseSuccess(okResponse());

    await expect(
      handleResponseError(forbidden(DEACTIVATED_MESSAGE)),
    ).rejects.toBeInstanceOf(AxiosError);

    expect(onDeactivated).toHaveBeenCalledTimes(2);
  });

  it("leaves a per-record denial to the caller", async () => {
    const error = forbidden(PER_RECORD_MESSAGE);

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(onDeactivated).not.toHaveBeenCalled();
  });

  it("leaves a failed sign-in to the login form", async () => {
    const error = forbidden(LOGIN_DEACTIVATED_MESSAGE, "/login");

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(onDeactivated).not.toHaveBeenCalled();
  });

  it("leaves a refusal about somebody else's inactive account alone", async () => {
    const error = forbidden(INACTIVE_CASHIER_MESSAGE);

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(onDeactivated).not.toHaveBeenCalled();
  });

  it("leaves an unrelated failure alone", async () => {
    const error = new AxiosError("Server Error");
    error.response = {
      status: 500,
      data: { message: "Server Error" },
    } as AxiosError["response"];

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(onDeactivated).not.toHaveBeenCalled();
  });
});
