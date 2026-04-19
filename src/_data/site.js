export default {
  title: "greg.iw",
  tagline: "A personal corner of the IndieWeb.",
  author: {
    name: "Greg",
    note: "Personal site following IndieWeb principles.",
    url: "https://gregs.space",
    photo: "/assets/img/avatar.png",
    email: "",
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog/" },
    { label: "About", href: "/about/" },
    { label: "Contact", href: "/contact/" },
  ],
  relMe: [
    { label: "GitHub", href: "https://github.com/hopk8412" },
    { label: "Mastodon", href: "https://example.social/@greg" },
  ],
  endpoints: {
    authorization: "https://indieauth.com/auth",
    token: "https://tokens.indieauth.com/token",
    micropub: "/api/micropub",
  },
};
