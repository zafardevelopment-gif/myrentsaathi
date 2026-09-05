/**
 * IndexNow helper — instantly notify Bing (and other IndexNow engines) that
 * URLs on the site were added or updated, instead of waiting for a crawl.
 *
 * Usage (server-side): await submitToIndexNow(["/blog/my-new-post", "/pricing"])
 * Pass site-relative paths or absolute URLs; both are normalised.
 *
 * The key file must be reachable at  {SITE_URL}/{INDEXNOW_KEY}.txt  (it is —
 * see public/<key>.txt). IndexNow verifies ownership by fetching that file.
 */
import { SITE_URL, INDEXNOW_KEY, absoluteUrl } from "@/lib/seo/config";

const ENDPOINT = "https://api.indexnow.org/indexnow";

function host(): string {
  return new URL(SITE_URL).host;
}

/** Submit one or more URLs/paths to IndexNow. Returns the HTTP status. */
export async function submitToIndexNow(
  urlsOrPaths: string[],
): Promise<{ ok: boolean; status: number; submitted: string[] }> {
  const urlList = Array.from(
    new Set(urlsOrPaths.map((u) => absoluteUrl(u))),
  ).slice(0, 10000); // IndexNow allows up to 10k per request

  if (urlList.length === 0) return { ok: false, status: 0, submitted: [] };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: host(),
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  });

  return { ok: res.ok, status: res.status, submitted: urlList };
}
