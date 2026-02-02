<template>
  <ion-app>
    <!-- Public routes skip the authenticator entirely -->
    <template v-if="isPublicRoute">
      <ion-router-outlet />
    </template>

    <!-- Private routes (default) require authentication -->
    <authenticator v-else :form-fields="formFields" @authenticator:state-change="onAuthStateChange">
      <template v-slot="{ signOut }">
        <ion-header>
          <ion-toolbar>
            <ion-title slot="start">
              <router-link to="/" style="text-decoration: none; color: inherit">Parish Events</router-link>
            </ion-title>
            <ion-buttons slot="end">
              <router-link to="/me" style="text-decoration: none; color: inherit">
                <ion-button>
                  <ion-icon slot="start" :icon="personOutline" />
                  {{ userStore?.nickname || userStore?.email || userStore?.username }}
                </ion-button>
              </router-link>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-router-outlet />
      </template>

      <template v-slot:header>
        <div style="text-align: center; padding: 1.5rem">
          <div style="font-size: 3rem; margin-bottom: 1rem">⛪</div>
          <h1 style="font-size: 1.75rem; line-height: 1.2; margin-bottom: 1rem; font-weight: 600">Parish Events Manager</h1>
          <p style="font-size: 1rem; color: var(--ion-color-medium); margin-bottom: 0.5rem">Manage your parish events and Mass schedules with modern tools.</p>
          <p style="font-size: 0.9rem; color: var(--ion-color-medium)">Login with your email and password to get started.</p>
        </div>
      </template>
    </authenticator>
  </ion-app>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";
import { Authenticator } from "@aws-amplify/ui-vue";
import "@aws-amplify/ui-vue/styles.css";
import { personOutline } from "ionicons/icons";
import {
  IonApp,
  IonRouterOutlet,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
} from "@ionic/vue";

const route = useRoute();
const userStore = useUserStore();

// Routes are private by default. Only routes with `meta: { public: true }` skip auth.
const isPublicRoute = computed(() => route.meta.public === true);

const formFields = {
  signUp: {
    nickname: {
      label: "Nickname",
      placeholder: "Enter your nickname",
      required: true,
    },
  },
};

async function onAuthStateChange() {
  await userStore.fetchUser();
}

onMounted(async () => {
  await userStore.fetchUser();
});
</script>
