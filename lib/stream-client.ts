import { STREAM_ERROR_MARK } from "./stream-protocol";

// POSTs JSON and feeds streamed text to onText as it arrives (the full text
// so far each time). Throws an Error with a user-facing message on failure,
// whether the failure happens before the stream starts (JSON error body) or
// partway through (error marker appended to the stream).
export async function streamPost(url: string, body: unknown, onText: (textSoFar: string) => void): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed");
  }
  if (!res.body) throw new Error("No response received");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += decoder.decode(value, { stream: true });
    const mark = acc.indexOf(STREAM_ERROR_MARK);
    onText(mark === -1 ? acc : acc.slice(0, mark));
  }
  acc += decoder.decode();

  const mark = acc.indexOf(STREAM_ERROR_MARK);
  if (mark !== -1) {
    const message = acc.slice(mark + STREAM_ERROR_MARK.length).trim() || "Something went wrong";
    const partial = acc.slice(0, mark).trim();
    throw new Error(partial ? `${message} (showing partial result above)` : message);
  }
  return acc;
}
