// src/scripts/publishedV1.smoke.test.ts
import { describe, expect, test } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function assertIsDir(p: string) {
  const st = await fs.stat(p);
  expect(st.isDirectory()).toBe(true);
}

async function assertIsFile(p: string) {
  const st = await fs.stat(p);
  expect(st.isFile()).toBe(true);
}

describe("published v1 smoke (filesystem)", () => {
  const root = process.cwd();
  const publishedRoot = path.join(root, "public", "data", "published", "v1");

  const genres = ["gold", "derived", "meta"] as const;
  const chains = ["bitcoin", "ethereum", "arbitrum", "base"] as const;

  test("published root exists", async () => {
    expect(await pathExists(publishedRoot)).toBe(true);
    await assertIsDir(publishedRoot);
  });

  test("genre folders exist", async () => {
    for (const g of genres) {
      const p = path.join(publishedRoot, g);
      expect(await pathExists(p)).toBe(true);
      await assertIsDir(p);
    }
  });

  test("chain folders and manifest.json exist for each (genre, chain)", async () => {
    for (const g of genres) {
      for (const c of chains) {
        const chainDir = path.join(publishedRoot, g, c);
        expect(await pathExists(chainDir)).toBe(true);
        await assertIsDir(chainDir);

        const manifest = path.join(chainDir, "manifest.json");
        expect(await pathExists(manifest)).toBe(true);
        await assertIsFile(manifest);
      }
    }
  });
});