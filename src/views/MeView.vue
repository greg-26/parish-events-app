<template>
  <ion-page>
    <ion-content class="ion-padding">
      <h2>Profile</h2>
      <p>
        Welcome {{ userStore.nickname }}!
        <a href="#" @click.prevent="signOut">Sign Out</a>
      </p>

      <ion-list>
        <ion-item>
          <ion-input label="Email" :value="email" readonly />
        </ion-item>
        <ion-item>
          <ion-input label="Nickname" v-model="nickname" />
        </ion-item>
        <ion-item>
          <ion-input label="User ID" :value="userId" readonly />
        </ion-item>
      </ion-list>

      <ion-button expand="block" class="ion-margin-top" @click="save">Update</ion-button>

      <ion-card class="ion-margin-top" v-if="whoami">
        <ion-card-header>
          <ion-card-title>API /whoami Response</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <pre style="font-size: 0.85rem; overflow-x: auto">{{ JSON.stringify(whoami, null, 2) }}</pre>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useUserStore } from "@/stores/user";
import { apiFetch } from "@/lib/api";
import { router } from "@/router";
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from "@ionic/vue";

const userStore = useUserStore();

const email = ref(userStore.email);
const nickname = ref(userStore.nickname);
const userId = ref(userStore.userId);

watch(() => userStore.email, (v) => { email.value = v; });
watch(() => userStore.nickname, (v) => { nickname.value = v; });
watch(() => userStore.userId, (v) => { userId.value = v; });

const whoami = ref<any>(null);

const save = async () => {
  await userStore.updateNickname(nickname.value);
};

const signOut = async () => {
  await userStore.signOut();
  router.push("/");
};

async function testApi() {
  const x = await apiFetch("/whoami");
  if (x.ok) {
    whoami.value = await x.json();
  } else {
    whoami.value = await x.text();
  }
}

onMounted(async () => {
  await userStore.fetchUser();
  testApi();
});
</script>
