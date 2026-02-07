import { describe, it, expect } from "vitest";
import { generateBoxName } from "../src/naming";

describe("generateBoxName", () => {
  it("generates single letter names A-Z for indices 0-25", () => {
    expect(generateBoxName(0)).toBe("Box A");
    expect(generateBoxName(1)).toBe("Box B");
    expect(generateBoxName(25)).toBe("Box Z");
  });

  it("generates AA-AZ for indices 26-51", () => {
    expect(generateBoxName(26)).toBe("Box AA");
    expect(generateBoxName(27)).toBe("Box AB");
    expect(generateBoxName(51)).toBe("Box AZ");
  });

  it("generates BA-BZ for indices 52-77", () => {
    expect(generateBoxName(52)).toBe("Box BA");
    expect(generateBoxName(53)).toBe("Box BB");
    expect(generateBoxName(77)).toBe("Box BZ");
  });

  it("generates ZZ at index 701", () => {
    expect(generateBoxName(701)).toBe("Box ZZ");
  });

  it("generates AAA at index 702", () => {
    expect(generateBoxName(702)).toBe("Box AAA");
  });
});
