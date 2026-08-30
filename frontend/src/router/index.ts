import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "recipe-list", component: () => import("../views/RecipeListView.vue") },
    {
      path: "/recipes/new",
      name: "recipe-new",
      component: () => import("../views/RecipeFormView.vue"),
    },
    {
      path: "/recipes/:id",
      name: "recipe-detail",
      component: () => import("../views/RecipeDetailView.vue"),
      props: true,
    },
    {
      path: "/recipes/:id/edit",
      name: "recipe-edit",
      component: () => import("../views/RecipeFormView.vue"),
      props: true,
    },
    {
      path: "/recipes/:id/brew",
      name: "recipe-brew",
      component: () => import("../views/BrewTimerView.vue"),
      props: true,
    },
    { path: "/logs", name: "log-list", component: () => import("../views/BrewLogListView.vue") },
    {
      path: "/logs/new",
      name: "log-new",
      component: () => import("../views/BrewLogFormView.vue"),
    },
    {
      path: "/logs/:id/edit",
      name: "log-edit",
      component: () => import("../views/BrewLogFormView.vue"),
      props: true,
    },
    { path: "/beans", name: "bean-list", component: () => import("../views/BeanListView.vue") },
    {
      path: "/beans/new",
      name: "bean-new",
      component: () => import("../views/BeanFormView.vue"),
    },
    {
      path: "/beans/:id/edit",
      name: "bean-edit",
      component: () => import("../views/BeanFormView.vue"),
      props: true,
    },
    { path: "/login", name: "login", component: () => import("../views/LoginView.vue") },
    { path: "/register", name: "register", component: () => import("../views/RegisterView.vue") },
  ],
});

export default router;
