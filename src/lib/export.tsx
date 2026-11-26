import { renderToStaticMarkup } from "react-dom/server";
import { Guidebook } from "../components/Guidebook";
import { tripSchema, type Trip } from "./trip";
import { guidebookCss } from "./guidebook-style";
import { guidebookFont, guidebookFontLicense } from "./guidebook-font";
import { defaultExportOptions, type ExportOptions } from "./export-options";
import { assertNoBookingReferences } from "./booking-privacy";
export const guidebookTemplateVersion = "4";
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
  imageData: Record<string, string> = {},
): GuidebookExport {
  const safeImages = Object.fromEntries(
    Object.entries(imageData).filter(
      ([, value]) =>
        value.length <= 4000000 &&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value),
    ),
  );
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
      <meta name="font-license" content={guidebookFontLicense} />
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
    '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; font-src data:; img-src data:; base-uri \'none\'; form-action \'none\'"><title>' +
    title +
    "</title>" +
    metadata +
    "<style>" +
    guidebookCss.replace(
      "/design-preview/fonts/PretendardVariable.woff2",
      guidebookFont,
    ) +
    "</style></head><body>" +
    renderToStaticMarkup(
      <Guidebook
        trip={trip}
        options={included}
        offline
        imageData={safeImages}
      />,
    ) +
    "</body></html>";
  assertNoBookingReferences(html);
  return { ...record, html };
}
export { downloadFile } from "./download";
