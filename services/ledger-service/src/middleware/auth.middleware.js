// Auth is now handled by API gateway only
// This middleware simply extracts tenant ID from trusted header

export const authenticate = async (req, res, next) => {
  const tenantId = req.headers["x-tenant-id"];

  if (!tenantId) {
    return res.status(401).json({
      error: "missing tenant context",
      code: "UNAUTHORIZED",
      requestId: req.headers["x-request-id"],
    });
  }

  req.tenantId = tenantId;
  next();
};
