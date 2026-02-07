import { describe, it, expect } from "vitest";
import { wrapText } from "../src/text";

describe("wrapText", () => {
  it("returns text as-is when it fits on one line", () => {
    expect(wrapText("Hello", 10)).toEqual(["Hello"]);
    expect(wrapText("Hello World", 20)).toEqual(["Hello World"]);
  });

  it("wraps text at spaces", () => {
    expect(wrapText("Hello World", 6)).toEqual(["Hello", "World"]);
    expect(wrapText("one two three", 8)).toEqual(["one two", "three"]);
  });

  it("wraps text at dots", () => {
    expect(wrapText("Box.Label", 5)).toEqual(["Box.", "Label"]);
  });

  it("wraps text at hyphens", () => {
    expect(wrapText("foo-bar-baz", 5)).toEqual(["foo-", "bar-", "baz"]);
  });

  it("handles text with no break points", () => {
    expect(wrapText("abcdefghij", 5)).toEqual(["abcde", "fghij"]);
  });

  it("handles empty string", () => {
    expect(wrapText("", 10)).toEqual([""]);
  });

  it("returns text as-is when maxCharsPerLine is 0", () => {
    expect(wrapText("Hello World", 0)).toEqual(["Hello World"]);
  });

  it("returns text as-is when maxCharsPerLine is negative", () => {
    expect(wrapText("Hello World", -5)).toEqual(["Hello World"]);
  });

  it("handles maxCharsPerLine of 1", () => {
    const result = wrapText("Hello", 1);
    expect(result).toEqual(["H", "e", "l", "l", "o"]);
  });

  it("trims whitespace from wrapped lines", () => {
    expect(wrapText("Hello   World", 7)).toEqual(["Hello", "World"]);
  });
});
