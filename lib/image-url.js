const TRADEME_THUMB_SEGMENT = "/photoserver/thumb/";

export function getTradeMeImageCandidates(url) {
  if (!url || typeof url !== "string") return ["/pixel-card-lab-logo.png"];
  if (!url.includes(TRADEME_THUMB_SEGMENT)) return [url, "/pixel-card-lab-logo.png"];

  const full = url.replace(TRADEME_THUMB_SEGMENT, "/photoserver/full/");
  const plus = url.replace(TRADEME_THUMB_SEGMENT, "/photoserver/plus/");

  return [full, plus, url, "/pixel-card-lab-logo.png"].filter(
    (value, index, all) => all.indexOf(value) === index
  );
}

export function getBestImageUrl(url) {
  const candidates = getTradeMeImageCandidates(url);
  return candidates[0] || "";
}
