import { renderToStaticMarkup } from "react-dom/server";
import { Guidebook } from "../components/Guidebook";
import { tripSchema, type Trip } from "./trip";
import { guidebookCss } from "./guidebook-style";
import { defaultExportOptions, type ExportOptions } from "./export-options";
export const guidebookTemplateVersion = "1";
export type GuidebookExport = {
  id: string;
  tripId: string;
  tripVersion: number;
  createdAt: string;
  templateVersion: string;
  options: ExportOptions;
  status: Trip["status"];
  html: string;
};
export function exportGuidebook(
  input: Trip,
  options: ExportOptions = defaultExportOptions,
) {
  return createGuidebookExport(input, options).html;
}
export function createGuidebookExport(
  input: Trip,
  options: ExportOptions = defaultExportOptions,
): GuidebookExport {
  const trip = tripSchema.parse(input);
  const included = {
    profile: options.profile,
    details: options.details,
    lodging: options.lodging,
    budget: options.budget,
  };
  const record = {
    id: crypto.randomUUID(),
    tripId: trip.id,
    tripVersion: trip.version,
    createdAt: new Date().toISOString(),
    templateVersion: guidebookTemplateVersion,
    options: included,
    status: trip.status,
  };
  const metadata = renderToStaticMarkup(
    <>
      <meta name="travel-guidebook-export" content={JSON.stringify(record)} />
    </>,
  );
  const title = trip.title.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
  const html =
    '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'"><title>' +
    title +
    "</title>" +
    metadata +
    "<style>" +
    guidebookCss +
    "</style></head><body>" +
    renderToStaticMarkup(<Guidebook trip={trip} options={included} />) +
    "</body></html>";
  return { ...record, html };
}
export function downloadFile(content: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
