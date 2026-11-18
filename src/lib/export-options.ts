export type ExportOptions = {
  profile: boolean;
  details: boolean;
  lodging: boolean;
  budget: boolean;
};
export const defaultExportOptions: ExportOptions = {
  profile: true,
  details: true,
  lodging: true,
  budget: true,
};
