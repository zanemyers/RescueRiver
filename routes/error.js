// Generic error handler (for all server-side errors)
function errorHandler(err, req, res, _next) {
  console.error("Unhandled error:", err);

  const status = err.status || 500;

  const defaults = {
    400: ["Bad Cast", "You’ve cast into rough waters. Try again.", "Bad Request"],
    403: ["Waters Off Limits", "You don't have access to this spot.", "Forbidden"],
    404: [
      "Gone Fishing...",
      "Looks like the page you were trying to find has drifted downstream.",
      "Page Not Found",
    ],
    500: [
      "Snagged a Line...",
      "Something went wrong on our end. We’re reeling it in.",
      "Server Error",
    ],
  };

  const [heading, message, title] = defaults[status] || [
    `Error ${status}`,
    "Something went wrong.",
    "Unexpected Error",
  ];

  res.status(status).render("error", {
    status_code: status,
    heading,
    message,
    title,
  });
}

export { errorHandler };
