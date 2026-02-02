<template>
  <ion-page>
    <!-- Pastoral Unit Header -->
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/pastoral-units" />
        </ion-buttons>
        <ion-title>
          {{ pastoralUnit?.name || 'Loading...' }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Pastoral Unit Navigation -->
    <ion-toolbar v-if="pastoralUnit">
      <ion-segment 
        v-model="activeTab" 
        @ion-change="onTabChange"
        scrollable
      >
        <ion-segment-button value="overview">
          <ion-icon :icon="gridOutline" />
          <ion-label>Overview</ion-label>
        </ion-segment-button>
        <ion-segment-button value="parishes">
          <ion-icon :icon="businessOutline" />
          <ion-label>Parishes</ion-label>
        </ion-segment-button>
        <ion-segment-button value="priests">
          <ion-icon :icon="peopleOutline" />
          <ion-label>Priests</ion-label>
        </ion-segment-button>
        <ion-segment-button value="calendar">
          <ion-icon :icon="calendarOutline" />
          <ion-label>Shared Calendar</ion-label>
        </ion-segment-button>
      </ion-segment>
    </ion-toolbar>

    <!-- Loading State -->
    <ion-content v-if="loading">
      <div class="loading">
        <ion-spinner />
        <p>Loading pastoral unit...</p>
      </div>
    </ion-content>

    <!-- Pastoral Unit Content -->
    <ion-router-outlet v-else-if="pastoralUnit" />

    <!-- Error State -->
    <ion-content v-else>
      <div class="error-state">
        <ion-icon :icon="alertCircleOutline" />
        <h2>Pastoral Unit Not Found</h2>
        <p>You don't have access to this pastoral unit or it doesn't exist.</p>
        <ion-button @click="$router.push('/pastoral-units')" color="primary">
          Back to Pastoral Units
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/lib/api';
import type { PastoralUnit } from '@/shared/types';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonRouterOutlet,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonButton
} from '@ionic/vue';
import {
  gridOutline,
  businessOutline,
  peopleOutline,
  calendarOutline,
  alertCircleOutline
} from 'ionicons/icons';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const pastoralUnit = ref<PastoralUnit | null>(null);

const pastoralUnitId = computed(() => route.params.id as string);
const activeTab = ref(route.path.split('/').pop() || 'overview');

async function fetchPastoralUnit() {
  try {
    loading.value = true;
    // TODO: Implement API call
    // const response = await api.get(`/pastoral-units/${pastoralUnitId.value}`);
    // pastoralUnit.value = response;
    
    // Mock data for now
    pastoralUnit.value = {
      id: pastoralUnitId.value,
      name: `Pastoral Unit ${pastoralUnitId.value}`,
      description: 'Mock pastoral unit for development',
      parishes: [],
      sharedPriests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user123'
    };
  } catch (error) {
    console.error('Failed to fetch pastoral unit:', error);
    pastoralUnit.value = null;
  } finally {
    loading.value = false;
  }
}

function onTabChange(event: any) {
  const value = event.detail.value;
  router.push(`/pastoral-unit/${pastoralUnitId.value}/${value}`);
}

// Update active tab when route changes
watch(() => route.path, (newPath) => {
  activeTab.value = newPath.split('/').pop() || 'overview';
});

onMounted(async () => {
  await fetchPastoralUnit();
});
</script>

<style scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  gap: 1rem;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
}

.error-state ion-icon {
  font-size: 4rem;
  color: var(--ion-color-danger);
}
</style>