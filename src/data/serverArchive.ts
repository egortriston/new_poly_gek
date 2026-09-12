export type ServerArchiveItem = {
  id: string;
  parent: string | null;
  name: string;
  kind: "folder" | "file";
  updated: number;
  size: number;
  version: string;
};
export type ArchiveContext = {
  folder: string;
  current: ServerArchiveItem | null;
  parents: ServerArchiveItem[];
  maxFileBytes: number;
};
