const isDangerousKey = (key) => key.startsWith("$") || key.includes(".");

const sanitizeValue = (value) => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(sanitizeValue);
    return;
  }

  Object.keys(value).forEach((key) => {
    if (isDangerousKey(key)) {
      delete value[key];
      return;
    }

    sanitizeValue(value[key]);
  });
};

export const inputSanitizerMiddleware = (req, _res, next) => {
  sanitizeValue(req.body);
  sanitizeValue(req.query);
  sanitizeValue(req.params);
  next();
};
