import { describe, expect, it } from "@jest/globals";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and keeps the latest conflicting utility", () => {
    const result = cn("px-2", "text-white", "px-4");

    expect(result).toContain("px-4");
    expect(result).toContain("text-white");
    expect(result).not.toContain("px-2");
  });
});
