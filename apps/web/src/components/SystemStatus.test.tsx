import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SystemStatus } from "./SystemStatus";

describe("SystemStatus", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/health")) {
          return new Response(
            JSON.stringify({ status: "ok", service: "api", version: "0.1.0" }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            status: "ok",
            checks: { postgres: "ok", redis: "ok", rabbitmq: "ok" },
          }),
          { status: 200 },
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders system status from API", async () => {
    render(<SystemStatus />);
    expect(await screen.findByText("System status")).toBeInTheDocument();
    expect(await screen.findByText("api")).toBeInTheDocument();
    expect(await screen.findByText("postgres")).toBeInTheDocument();
  });
});
