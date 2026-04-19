import { describe, expect, it, vi } from "vitest";

import { chooseWorkspaceDirectory } from "@/lib/directory-picker";

describe("workspace directory picker", () => {
  it("returns a selected path when the environment exposes one", async () => {
    const selection = await chooseWorkspaceDirectory({
      showDirectoryPicker: vi.fn(async () => ({
        name: "docs-vault",
        path: "E:/workspaces/docs-vault",
      })),
    });

    expect(selection).toEqual({
      directoryName: "docs-vault",
      message: "Selected directory: E:/workspaces/docs-vault",
      path: "E:/workspaces/docs-vault",
      supported: true,
    });
  });

  it("keeps manual entry available when the picker is unavailable", async () => {
    const selection = await chooseWorkspaceDirectory({});

    expect(selection).toEqual({
      directoryName: null,
      message: "Directory picker is unavailable here. Enter the root path manually.",
      path: null,
      supported: false,
    });
  });

  it("explains when a browser hides the absolute path", async () => {
    const selection = await chooseWorkspaceDirectory({
      showDirectoryPicker: vi.fn(async () => ({
        name: "docs-vault",
      })),
    });

    expect(selection).toEqual({
      directoryName: "docs-vault",
      message:
        "Selected docs-vault, but this browser did not expose its full path. Enter the root path manually.",
      path: null,
      supported: true,
    });
  });
});
