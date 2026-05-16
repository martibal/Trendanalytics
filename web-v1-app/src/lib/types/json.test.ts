// src/lib/types/json.test.ts
import {
  isChainId,
  isDataGenre,
  isJsonObject,
  isWindowToken,
} from "@/lib/types/json";

describe("types/json", () => {
  describe("isJsonObject", () => {
    it("returns true for plain objects", () => {
      expect(isJsonObject({})).toBe(true);
      expect(isJsonObject({ a: 1, b: "x" })).toBe(true);
    });

    it("returns false for arrays, null, and primitives", () => {
      expect(isJsonObject([])).toBe(false);
      expect(isJsonObject(null)).toBe(false);
      expect(isJsonObject("x")).toBe(false);
      expect(isJsonObject(1)).toBe(false);
      expect(isJsonObject(true)).toBe(false);
      expect(isJsonObject(undefined)).toBe(false);
    });
  });

  describe("isWindowToken", () => {
    it("accepts supported window tokens", () => {
      expect(isWindowToken("latest")).toBe(true);
      expect(isWindowToken("7d")).toBe(true);
      expect(isWindowToken("30d")).toBe(true);
      expect(isWindowToken("90d")).toBe(true);
      expect(isWindowToken("180d")).toBe(true);
      expect(isWindowToken("365d")).toBe(true);
    });

    it("rejects unsupported window tokens", () => {
      expect(isWindowToken("1d")).toBe(false);
      expect(isWindowToken("14d")).toBe(false);
      expect(isWindowToken("all")).toBe(false);
      expect(isWindowToken("")).toBe(false);
      expect(isWindowToken(null)).toBe(false);
      expect(isWindowToken(undefined)).toBe(false);
    });
  });

  describe("isChainId", () => {
    it("accepts supported chain ids", () => {
      expect(isChainId("bitcoin")).toBe(true);
      expect(isChainId("ethereum")).toBe(true);
      expect(isChainId("arbitrum")).toBe(true);
      expect(isChainId("base")).toBe(true);
    });

    it("rejects unsupported chain ids", () => {
      expect(isChainId("solana")).toBe(false);
      expect(isChainId("polygon")).toBe(false);
      expect(isChainId("")).toBe(false);
      expect(isChainId(null)).toBe(false);
      expect(isChainId(undefined)).toBe(false);
    });
  });

  describe("isDataGenre", () => {
    it("accepts supported data genres", () => {
      expect(isDataGenre("gold")).toBe(true);
      expect(isDataGenre("meta")).toBe(true);
      expect(isDataGenre("derived")).toBe(true);
      expect(isDataGenre("briefs")).toBe(true);
    });

    it("rejects unsupported data genres", () => {
      expect(isDataGenre("raw")).toBe(false);
      expect(isDataGenre("summary")).toBe(false);
      expect(isDataGenre("")).toBe(false);
      expect(isDataGenre(null)).toBe(false);
      expect(isDataGenre(undefined)).toBe(false);
    });
  });
});