import { describe, expect, test } from "vite-plus/test";

import {
  DEFAULT_PAGE_SIZE,
  filterRows,
  fold,
  paginate,
  parseTableQuery,
  withParams,
} from "./table";

describe("parseTableQuery", () => {
  test("parses and clamps the URL state", () => {
    const q = parseTableQuery(
      new URLSearchParams("q=%20moyo%20&page=-3&per=1000&role=guardian&x=1"),
      ["role"],
    );
    expect(q).toEqual({
      q: "moyo",
      page: 1,
      perPage: 100,
      filters: { role: "guardian" },
    });
  });

  test("falls back on nonsense", () => {
    const q = parseTableQuery(new URLSearchParams("page=abc&per="));
    expect(q.page).toBe(1);
    expect(q.perPage).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("filterRows", () => {
  const rows = [
    { name: "Chipo Ndlovu", role: "member" },
    { name: "Tendai Moyo", role: "guardian" },
    { name: "Zoë Moyo", role: "member" },
  ];
  const names = (q: string, filters: Record<string, string> = {}) =>
    filterRows(
      rows,
      { q, filters },
      (r) => [r.name],
      (r, n) => (n === "role" ? r.role : null),
    ).map((r) => r.name);

  test("matches every word, ignoring case and accents", () => {
    expect(names("moyo")).toEqual(["Tendai Moyo", "Zoë Moyo"]);
    expect(names("ZOE moyo")).toEqual(["Zoë Moyo"]);
    expect(names("")).toHaveLength(3);
    expect(fold("Zoë")).toBe("zoe");
  });

  test("filters need an exact match", () => {
    expect(names("", { role: "member" })).toEqual(["Chipo Ndlovu", "Zoë Moyo"]);
    expect(names("moyo", { role: "guardian" })).toEqual(["Tendai Moyo"]);
  });
});

describe("paginate", () => {
  const rows = Array.from({ length: 30 }, (_, i) => i);

  test("reports what is shown", () => {
    expect(paginate(rows, 2, 25)).toEqual({
      rows: [25, 26, 27, 28, 29],
      page: 2,
      pageCount: 2,
      total: 30,
      from: 26,
      to: 30,
    });
  });

  test("clamps past the end and handles nothing", () => {
    expect(paginate(rows, 99, 25).page).toBe(2);
    expect(paginate([], 1, 25)).toEqual({
      rows: [],
      page: 1,
      pageCount: 1,
      total: 0,
      from: 0,
      to: 0,
    });
  });
});

describe("withParams", () => {
  test("changes only the given parameters", () => {
    const url = new URL("http://x/list?q=moyo&page=3");
    expect(withParams(url, { page: 4 })).toBe("/list?q=moyo&page=4");
    expect(withParams(url, { q: null, page: null })).toBe("/list");
  });
});
