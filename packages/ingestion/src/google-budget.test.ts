import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleBudgetExceeded, getPlace, googleRequestsUsed, limitGoogleRequests } from "./google.ts";

describe("plafonul de cereri Google per rulare", () => {
  afterEach(() => {
    limitGoogleRequests(null);
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  it("peste plafon se oprește înainte să trimită cererea", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "test";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    limitGoogleRequests(2);
    await getPlace("a");
    await getPlace("b");
    await expect(getPlace("c")).rejects.toBeInstanceOf(GoogleBudgetExceeded);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(googleRequestsUsed()).toBe(2);
  });
});
