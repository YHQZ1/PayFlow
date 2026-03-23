import { v4 as uuidv4 } from "uuid";

// Generates a unique request ID for every incoming request.
// Propagates it downstream via X-Request-ID header.
// Returns it in the response so clients can trace requests end-to-end.
export const requestId = (req, res, next) => {
  const id = req.headers["x-request-id"] || uuidv4();
  req.requestId = id;
  res.setHeader("X-Request-ID", id);
  next();
};
