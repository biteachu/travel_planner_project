import { renderToStaticMarkup } from "react-dom/server";
import { Guidebook } from "../components/Guidebook";
import { tripSchema, type Trip } from "./trip";
import { guidebookCss } from "./guidebook-style";
export function exportGuidebook(input: Trip) {
  const trip = tripSchema.parse(input);
  const title = trip.title.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
  return (
    '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'"><title>' +
    title +
    "</title><style>" +
    guidebookCss +
    "</style></head><body>" +
    renderToStaticMarkup(<Guidebook trip={trip} />) +
    "</body></html>"
  );
}
export function downloadFile(content: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
