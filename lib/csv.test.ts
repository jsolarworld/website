import { describe, expect, it } from "vitest";
import { csvCell, parseCsv, parseCsvRecords } from "./csv";

describe("parseCsv", () => {
  it("parses simple rows with LF and CRLF", () => {
    expect(parseCsv("a,b\n1,2\r\n3,4")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });

  it("handles quoted commas, escaped quotes and newlines inside quotes", () => {
    expect(parseCsv('name,note\n"Inverter, 5kVA","He said ""hi""\nsecond line"')).toEqual([
      ["name", "note"],
      ["Inverter, 5kVA", 'He said "hi"\nsecond line'],
    ]);
  });

  it("strips an Excel BOM and skips blank lines", () => {
    expect(parseCsv("﻿a,b\n\n1,2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("keeps empty trailing fields", () => {
    expect(parseCsv("a,b,c\n1,,")).toEqual([["a", "b", "c"], ["1", "", ""]]);
  });
});

describe("parseCsvRecords", () => {
  it("keys records by lower-cased trimmed headers", () => {
    const { headers, records } = parseCsvRecords(" SKU ,Name\nX1, Fan \n");
    expect(headers).toEqual(["sku", "name"]);
    expect(records).toEqual([{ sku: "X1", name: "Fan" }]);
  });

  it("returns nothing for empty input", () => {
    expect(parseCsvRecords("")).toEqual({ headers: [], records: [] });
  });
});

describe("csvCell", () => {
  it("quotes only when needed", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell(null)).toBe("");
    expect(csvCell(5)).toBe("5");
  });
});
