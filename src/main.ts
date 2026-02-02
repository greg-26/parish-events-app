import { createApp } from "vue";
import App from "./App.vue";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import { router } from "./router";
import { createPinia } from "pinia";

// Ionic
import { IonicVue } from "@ionic/vue";
import "@ionic/vue/css/ionic.bundle.css";

const pinia = createPinia();

Amplify.configure(outputs);

const app = createApp(App);
app.use(IonicVue);
app.use(router);
app.use(pinia);
app.mount("#app");
