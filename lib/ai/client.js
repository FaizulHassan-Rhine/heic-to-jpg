/**
 * Client helper for ConvertMastery AI text tools.
 */
export async function callAiApi(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    err.remaining = data.remaining;
    err.limit = data.limit;
    throw err;
  }

  return data;
}
