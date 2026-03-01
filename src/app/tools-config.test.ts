import { describe, it, expect } from "vitest";
import {
  TOOLS,
  TOOL_PATHS,
  TOOL_CATEGORIES,
  getToolBySlug,
  getToolById,
  getToolByPath,
  getToolByPath,
} from "./tools-config";

describe("tools-config", () => {
  it("TOOLS has all required paths in TOOL_PATHS", () => {
    const paths = new Set(TOOL_PATHS);
    for (const tool of TOOLS) {
      expect(paths.has(tool.path)).toBe(true);
    }
  });

  it("getToolBySlug returns tool for valid slug", () => {
    expect(getToolBySlug("pdf-v-kartinki")).toEqual(TOOLS[0]);
    expect(getToolBySlug("obedinit-pdf")?.id).toBe("merge");
  });

  it("getToolBySlug returns null for invalid slug", () => {
    expect(getToolBySlug("")).toBeNull();
    expect(getToolBySlug("unknown-slug")).toBeNull();
  });

  it("getToolById returns tool for valid id", () => {
    expect(getToolById("merge")).toEqual(TOOLS.find((t) => t.id === "merge"));
    expect(getToolById("pdfToImage")?.path).toBe("pdf-to-image");
  });

  it("getToolById returns null for invalid id", () => {
    expect(getToolById("")).toBeNull();
    expect(getToolById("unknownId")).toBeNull();
  });

  it("getToolByPath returns tool for valid path", () => {
    expect(getToolByPath("merge-pdf")?.id).toBe("merge");
    expect(getToolByPath("pdf-to-word")?.slug).toBe("pdf-v-word");
  });

  it("getToolByPath returns null for invalid path", () => {
    expect(getToolByPath("")).toBeNull();
    expect(getToolByPath("/merge-pdf")).toBeNull();
  });

  it("all tools have unique id, slug, path", () => {
    const ids = new Set<string>();
    const slugs = new Set<string>();
    const paths = new Set<string>();
    for (const t of TOOLS) {
      expect(ids.has(t.id)).toBe(false);
      expect(slugs.has(t.slug)).toBe(false);
      expect(paths.has(t.path)).toBe(false);
      ids.add(t.id);
      slugs.add(t.slug);
      paths.add(t.path);
    }
  });

  it("TOOL_CATEGORIES includes all and known categories", () => {
    const catIds = new Set(TOOL_CATEGORIES.map((c) => c.id));
    expect(catIds.has("all")).toBe(true);
    for (const tool of TOOLS) {
      expect(catIds.has(tool.category)).toBe(true);
    }
  });
});
