import type { GuidePhoto as Photo } from "../lib/guide-visuals";
export function GuidePhoto({
  photo,
  offline = false,
  imageData = {},
}: {
  photo: Photo;
  offline?: boolean;
  imageData?: Record<string, string>;
}) {
  const src = offline ? imageData[photo.file] : photo.url;
  return (
    <figure className="destination-photo">
      {src ? (
        <img src={src} alt={photo.title} loading="lazy" />
      ) : (
        <p className="photo-unavailable">사진이 파일에 포함되지 않았습니다.</p>
      )}
      <figcaption>
        <span>{photo.title}</span>
        <details>
          <summary>사진 출처</summary>
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
            {photo.credit} · {photo.license}
          </a>
          {" · "}
          <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
            이용 조건
          </a>
          <small>화면에 맞게 자름{offline ? " · 크기·압축 조정" : ""}</small>
        </details>
      </figcaption>
    </figure>
  );
}
