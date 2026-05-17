import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import { makeAPICapture } from "../helpers";

vi.mock("../../client", () => ({
  askJSON: vi.fn().mockResolvedValue([]),
}));

describe("contract-validator", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array when no captures file exists", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const { validateContracts } = await import(
      "../../modules/contract-validator"
    );
    const result = await validateContracts();
    expect(result).toEqual([]);
  });

  it("returns empty array when captures list is empty", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue("[]");

    const { validateContracts } = await import(
      "../../modules/contract-validator"
    );
    const result = await validateContracts();
    expect(result).toEqual([]);
  });

  it("sends grouped captures to Claude and returns violations", async () => {
    const captures = [
      makeAPICapture({ method: "GET", url: "http://localhost:8080/api/products" }),
      makeAPICapture({
        method: "POST",
        url: "http://localhost:8080/api/products",
        status: 201,
        requestBody: { name: "Widget" },
      }),
    ];

    // First call: existsSync for apiCaptures, second for contractsDir
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      if (String(p).includes("api-captures")) return true;
      return false; // no contracts dir
    });
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(captures));
    vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
    vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);

    const mockViolations = [
      {
        endpoint: "/api/products",
        method: "GET",
        issue: "Missing pagination metadata",
        severity: "warning",
        details: "Response lacks total count",
      },
    ];

    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(mockViolations);

    const { validateContracts } = await import(
      "../../modules/contract-validator"
    );
    const result = await validateContracts();

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("warning");
    expect(askJSON).toHaveBeenCalledOnce();
  });

  it("saves inferred contracts after validation", async () => {
    const captures = [
      makeAPICapture({ method: "GET", url: "http://localhost:8080/api/products", status: 200 }),
    ];

    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      if (String(p).includes("api-captures")) return true;
      return false;
    });
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(captures));
    const mkdirSpy = vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);

    const { validateContracts } = await import(
      "../../modules/contract-validator"
    );
    await validateContracts();

    expect(mkdirSpy).toHaveBeenCalled();
    // One write for the inferred contract
    expect(writeSpy).toHaveBeenCalled();
    const contractWrite = writeSpy.mock.calls.find(
      (call) => String(call[0]).includes("GET-_api_products")
    );
    expect(contractWrite).toBeDefined();
  });
});
