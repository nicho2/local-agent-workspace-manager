export interface DirectorySelection {
  directoryName: string | null;
  message: string;
  path: string | null;
  supported: boolean;
}

interface DirectoryHandle {
  name?: string;
  path?: string;
}

interface DirectoryPickerWindow {
  showDirectoryPicker?: () => Promise<DirectoryHandle>;
}

function asDirectoryPickerWindow(value: unknown): DirectoryPickerWindow {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const candidate = value as { showDirectoryPicker?: unknown };
  if (typeof candidate.showDirectoryPicker !== "function") {
    return {};
  }
  const showDirectoryPicker = candidate.showDirectoryPicker as () => Promise<DirectoryHandle>;

  return {
    showDirectoryPicker: () => showDirectoryPicker.call(value),
  };
}

function getDirectoryPath(handle: DirectoryHandle): string | null {
  if (typeof handle.path === "string" && handle.path.trim().length > 0) {
    return handle.path;
  }
  return null;
}

export async function chooseWorkspaceDirectory(
  pickerWindow: unknown
): Promise<DirectorySelection> {
  const directoryPickerWindow = asDirectoryPickerWindow(pickerWindow);

  if (!directoryPickerWindow.showDirectoryPicker) {
    return {
      directoryName: null,
      message: "Directory picker is unavailable here. Enter the root path manually.",
      path: null,
      supported: false,
    };
  }

  const handle = await directoryPickerWindow.showDirectoryPicker();
  const path = getDirectoryPath(handle);

  if (path) {
    return {
      directoryName: handle.name ?? null,
      message: `Selected directory: ${path}`,
      path,
      supported: true,
    };
  }

  const folderName = handle.name ?? "selected folder";
  return {
    directoryName: folderName,
    message: `Selected ${folderName}, but this browser did not expose its full path. Enter the root path manually.`,
    path: null,
    supported: true,
  };
}
