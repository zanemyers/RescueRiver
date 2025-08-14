// Generic Express error handler middleware for all server-side errors
export function errorHandler(err, req, res, _next) {
  console.error("Unhandled error:", err);

  const status = err.status || 500;

  // Predefined error messages for common HTTP statuses
  const defaults = {
    400: {
      heading: "Bad Cast",
      message: "You’ve cast into rough waters. Try again.",
      title: "Bad Request",
    },
    403: {
      heading: "Waters Off Limits",
      message: "You don't have access to this spot.",
      title: "Forbidden",
    },
    404: {
      heading: "Gone Fishing...",
      message: "Looks like the page you were trying to find has drifted downstream.",
      title: "Page Not Found",
    },
    500: {
      heading: "Snagged a Line...",
      message: "Something went wrong on our end. We’re reeling it in.",
      title: "Server Error",
    },
    default: {
      heading: `Error ${status}`,
      message: "Something went wrong.",
      title: "Unexpected Error",
    },
  };

  res.status(status).render("error", {
    status_code: status,
    ...(defaults[status] || defaults["default"]),
  });
}
