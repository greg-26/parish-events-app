<template>
  <ion-page>
    <!-- Parish Header -->
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" />
        </ion-buttons>
        <ion-title>
          {{ parish?.name || 'Loading...' }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="canManage" @click="showPublicUrl = true" fill="clear">
            <ion-icon :icon="linkOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- Parish Navigation -->
    <ion-toolbar v-if="parish">
      <ion-segment 
        v-model="activeTab" 
        @ion-change="onTabChange"
        scrollable
      >
        <ion-segment-button value="events">
          <ion-icon :icon="calendarOutline" />
          <ion-label>Events</ion-label>
        </ion-segment-button>
        <ion-segment-button value="calendar">
          <ion-icon :icon="calendarSharp" />
          <ion-label>Calendar</ion-label>
        </ion-segment-button>
        <ion-segment-button value="locations">
          <ion-icon :icon="locationOutline" />
          <ion-label>Locations</ion-label>
        </ion-segment-button>
        <ion-segment-button value="priests">
          <ion-icon :icon="peopleOutline" />
          <ion-label>Priests</ion-label>
        </ion-segment-button>
        <ion-segment-button v-if="canAdmin" value="settings">
          <ion-icon :icon="settingsOutline" />
          <ion-label>Settings</ion-label>
        </ion-segment-button>
      </ion-segment>
    </ion-toolbar>

    <!-- Loading State -->
    <ion-content v-if="loading">
      <div class="loading">
        <ion-spinner />
        <p>Loading parish...</p>
      </div>
    </ion-content>

    <!-- Parish Content -->
    <ion-router-outlet v-else-if="parish" />

    <!-- Error State -->
    <ion-content v-else>
      <div class="error-state">
        <ion-icon :icon="alertCircleOutline" />
        <h2>Parish Not Found</h2>
        <p>You don't have access to this parish or it doesn't exist.</p>
        <ion-button @click="$router.push('/')" color="primary">
          Back to Dashboard
        </ion-button>
      </div>
    </ion-content>

    <!-- Public URL Modal -->
    <ion-modal :is-open="showPublicUrl" @did-dismiss="showPublicUrl = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Public Parish URL</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showPublicUrl = false" fill="clear">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="modal-content">
          <p>Share this public URL to allow apps and AI assistants to access your parish's event schedule:</p>
          
          <ion-item>
            <ion-input
              :value="publicUrl"
              readonly
              label="Public Events URL"
              label-placement="stacked"
            />
            <ion-button 
              slot="end" 
              fill="clear" 
              @click="copyPublicUrl"
            >
              <ion-icon :icon="copyOutline" />
            </ion-button>
          </ion-item>
          
          <div class="info-section">
            <h4>Mass Times Protocol</h4>
            <p>This URL returns structured JSON-LD data following the Mass Times Protocol standard, making your events discoverable by:</p>
            <ul>
              <li>Catholic Mass finder apps</li>
              <li>AI assistants (ChatGPT, Claude, etc.)</li>
              <li>Google Search and other crawlers</li>
              <li>Parish directory services</li>
            </ul>
            
            <ion-button 
              href="https://masstimesprotocol.org" 
              target="_blank"
              fill="outline"
              size="small"
            >
              Learn More About the Protocol
            </ion-button>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/lib/api';
import type { Parish, ParishMembership } from '@/shared/types';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonContent,
  IonRouterOutlet,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonModal,
  IonInput,
  IonItem,
  toastController
} from '@ionic/vue';
import {
  calendarOutline,
  calendarSharp,
  locationOutline,
  peopleOutline,
  settingsOutline,
  linkOutline,
  closeOutline,
  copyOutline,
  alertCircleOutline
} from 'ionicons/icons';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const parish = ref<Parish | null>(null);
const userRole = ref<string>('viewer');
const showPublicUrl = ref(false);

const parishId = computed(() => route.params.id as string);
const activeTab = ref(route.path.split('/').pop() || 'events');

const canManage = computed(() => ['admin', 'manager'].includes(userRole.value));
const canAdmin = computed(() => userRole.value === 'admin');

const publicUrl = computed(() => {
  if (!parish.value) return '';
  const baseUrl = window.location.origin;
  return `${baseUrl}/api/public/parish/${parish.value.id}/events`;
});

async function fetchParish() {
  try {
    loading.value = true;
    const response = await api.get(`/parish/${parishId.value}`);
    parish.value = response.parish;
    userRole.value = response.userRole;
  } catch (error) {
    console.error('Failed to fetch parish:', error);
    parish.value = null;
  } finally {
    loading.value = false;
  }
}

function onTabChange(event: any) {
  const value = event.detail.value;
  router.push(`/parish/${parishId.value}/${value}`);
}

async function copyPublicUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value);
    const toast = await toastController.create({
      message: 'URL copied to clipboard!',
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  } catch (error) {
    console.error('Failed to copy URL:', error);
  }
}

// Update active tab when route changes
watch(() => route.path, (newPath) => {
  activeTab.value = newPath.split('/').pop() || 'events';
});

onMounted(async () => {
  await fetchParish();
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

.modal-content {
  padding: 1rem;
}

.info-section {
  margin-top: 2rem;
  padding: 1rem;
  background: var(--ion-color-light);
  border-radius: 8px;
}

.info-section h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--ion-color-primary);
}

.info-section ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
</style>