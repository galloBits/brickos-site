// Agent responses stream back as plain text. If something fails after the
// stream has started (HTTP headers are already sent), the server appends this
// marker followed by a user-facing message, and the client turns it into an error.
export const STREAM_ERROR_MARK = "\u0000AGENT_ERROR:";
