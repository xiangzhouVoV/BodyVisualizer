const BLOG_ORIGIN = "https://body-visualizer-blog.pages.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/blog") {
      return Response.redirect(new URL("/blog/", url), 308);
    }

    if (url.pathname.startsWith("/blog/")) {
      const blogUrl = new URL(url.pathname.slice("/blog".length), BLOG_ORIGIN);
      blogUrl.search = url.search;

      return fetch(new Request(blogUrl, request));
    }

    return env.ASSETS.fetch(request);
  },
};
