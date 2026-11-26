import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  findPlaces,
  commonsPhoto,
  findRoutePlace,
} from "../../../lib/place-media";
import { readLimitedBody } from "../../../lib/request-body";
import { assertNoBookingReferences } from "../../../lib/booking-privacy";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: NextRequest) {
  // Next's dev server may normalize nextUrl to localhost even when the
  // browser uses the fixed loopback host of the PC launcher.
  const localOrigin =
    process.env.TRAVEL_LOCAL_CHATGPT === "1" &&
    !process.env.VERCEL &&
    request.headers.get("host") === "127.0.0.1:3417" &&
    request.headers.get("origin") === "http://127.0.0.1:3417";
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== request.nextUrl.origin &&
    !localOrigin
  )
    return NextResponse.json(
      { error: "허용되지 않은 요청입니다." },
      { status: 403 },
    );
  try {
    const input = z
      .object({
        query: z.string().trim().min(1).max(250),
        city: z.string().max(200),
        photos: z.boolean().optional(),
        route: z.boolean().optional(),
        aliases: z.array(z.string().trim().min(1).max(200)).max(3).optional(),
        file: z.string().max(500).optional(),
      })
      .parse(JSON.parse(await readLimitedBody(request, 5000)));
    assertNoBookingReferences(input);
    if (input.route && !input.file)
      return NextResponse.json({
        candidates: await findRoutePlace(
          input.query,
          input.city,
          request.signal,
          input.photos,
          input.aliases,
        ),
      });
    if (!input.file)
      return NextResponse.json({
        candidates: await findPlaces(
          input.query,
          input.city,
          request.signal,
          input.photos,
        ),
      });
    const photo = await commonsPhoto(
      input.file,
      input.city,
      input.query,
      request.signal,
    );
    if (!photo) throw new Error("사진의 재사용 조건을 확인하지 못했습니다.");
    const image = await fetch(photo.url, {
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
    });
    if (
      !image.ok ||
      !/^image\/(jpeg|png|webp)$/.test(image.headers.get("content-type") || "")
    )
      throw new Error("사진을 내려받지 못했습니다.");
    const reader = image.body!.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 3000000) {
          await reader.cancel();
          throw new Error("사진 크기가 너무 큽니다.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const { default: sharp } = await import("sharp");
    const buffer = await sharp(Buffer.concat(chunks), {
      limitInputPixels: 40000000,
    })
      .resize({ width: 1000, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    return NextResponse.json({
      photo,
      dataUrl: `data:image/jpeg;base64,${buffer.toString("base64")}`,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "사진·위치를 가져오지 못했습니다. 검색어를 짧은 장소명으로 바꾸거나 잠시 후 다시 시도해 주세요.",
      },
      { status: 400 },
    );
  }
}
