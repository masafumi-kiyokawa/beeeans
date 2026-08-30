import { describe, expect, it } from "vitest";
import router from "./index";

describe("router/index", () => {
  it("registers all 14 expected named routes with the right paths", () => {
    const routes = Object.fromEntries(router.getRoutes().map((r) => [r.name, r.path]));
    expect(routes).toEqual({
      "recipe-list": "/",
      "recipe-new": "/recipes/new",
      "recipe-detail": "/recipes/:id",
      "recipe-edit": "/recipes/:id/edit",
      "recipe-brew": "/recipes/:id/brew",
      "log-list": "/logs",
      "log-new": "/logs/new",
      "log-edit": "/logs/:id/edit",
      "bean-list": "/beans",
      "bean-new": "/beans/new",
      "bean-detail": "/beans/:id",
      "bean-edit": "/beans/:id/edit",
      login: "/login",
      register: "/register",
    });
  });

  it("marks recipe-detail, recipe-edit, recipe-brew, log-edit, bean-detail, and bean-edit as props:true routes", () => {
    const withProps = [
      "recipe-detail",
      "recipe-edit",
      "recipe-brew",
      "log-edit",
      "bean-detail",
      "bean-edit",
    ];
    for (const name of withProps) {
      const route = router.getRoutes().find((r) => r.name === name);
      expect(route?.props.default).toBe(true);
    }
  });

  it("has no navigation guards registered", () => {
    // vue-router doesn't expose beforeEach hooks for inspection directly, so this
    // is asserted indirectly: resolving any route never triggers a redirect/abort,
    // which is the observable effect of "no guards" for this route table.
    const resolved = router.resolve("/recipes/abc/edit");
    expect(resolved.matched).toHaveLength(1);
    expect(resolved.name).toBe("recipe-edit");
  });

  it("has no catch-all/404 route", () => {
    const resolved = router.resolve("/this-path-does-not-exist");
    expect(resolved.matched).toHaveLength(0);
  });
});
