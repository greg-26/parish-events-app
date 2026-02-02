import { createRouter, createWebHistory } from "@ionic/vue-router";
import HomeView from "./views/HomeView.vue";

const routes = [
  { path: "/", component: HomeView },
  { path: "/me", component: () => import("./views/MeView.vue") },

  // Parish management routes
  { 
    path: "/parish/:id", 
    component: () => import("./views/ParishView.vue"),
    children: [
      { path: "", redirect: to => `/parish/${to.params.id}/events` },
      { path: "events", component: () => import("./views/ParishEventsView.vue") },
      { path: "calendar", component: () => import("./views/ParishCalendarView.vue") },
      { path: "locations", component: () => import("./views/ParishLocationsView.vue") },
      { path: "priests", component: () => import("./views/ParishPriestsView.vue") },
      { path: "settings", component: () => import("./views/ParishSettingsView.vue") }
    ]
  },

  // Public routes — accessible without authentication.
  // Add `meta: { public: true }` to opt out of the auth wrapper.
  // ⚠️ All routes are PRIVATE by default.
  {
    path: "/welcome",
    component: () => import("./views/PublicView.vue"),
    meta: { public: true },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
