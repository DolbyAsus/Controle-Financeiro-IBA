import { describe, expect, it } from "vitest";

import { databasePage, paginationRange } from "./pagination";

describe("paginationRange", () => {
  it("normaliza páginas inválidas e calcula o intervalo inclusivo", () => {
    expect(paginationRange("inválida")).toEqual({ page: 1, from: 0, to: 9, pageSize: 10 });
    expect(paginationRange("3")).toEqual({ page: 3, from: 20, to: 29, pageSize: 10 });
    expect(paginationRange("-2", 25)).toEqual({ page: 1, from: 0, to: 24, pageSize: 25 });
  });
});

describe("databasePage", () => {
  it("usa a contagem exata do banco sem recortar novamente os itens", () => {
    const items = [{ id: "a" }, { id: "b" }];
    expect(databasePage(items, 42, 2)).toEqual({
      items,
      page: 2,
      totalPages: 5,
      count: 42,
    });
  });

  it("mantém uma página vazia estável", () => {
    expect(databasePage([], null, 1)).toEqual({
      items: [],
      page: 1,
      totalPages: 1,
      count: 0,
    });
  });
});
