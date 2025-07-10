document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname; // e.g. "/about"
  const navLinks = document.querySelectorAll(".navbar-nav .nav-link");

  navLinks.forEach((link) => {
    // Check if link href matches current path exactly
    const linkPath = new URL(link.href).pathname;

    if (linkPath === currentPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});
