const BLOG_ORIGIN = "https://body-visualizer-blog.pages.dev";
const API_ORIGIN = "https://server.body-simulator.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/blog") {
      return Response.redirect(new URL("/blog/", url), 308);
    }

    if (url.pathname.startsWith("/api/")) {
      const apiUrl = new URL(`${url.pathname}${url.search}`, API_ORIGIN);
      return fetch(new Request(apiUrl, request));
    }

    if (url.pathname.startsWith("/blog/")) {
      const blogUrl = new URL(url.pathname.slice("/blog".length), BLOG_ORIGIN);
      blogUrl.search = url.search;

      return fetch(new Request(blogUrl, request));
    }

    return env.ASSETS.fetch(request);
  },
};
