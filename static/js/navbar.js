document.addEventListener("DOMContentLoaded", () => {
  // Get the current URL path (e.g., "/about")
  const currentPath = window.location.pathname;

  // Select all navigation links inside the navbar
  const navLinks = document.querySelectorAll(".navbar-nav .nav-link");

  navLinks.forEach((link) => {
    // Extract just the pathname from the link's full URL
    const linkPath = new URL(link.href).pathname;

    if (linkPath === currentPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});
