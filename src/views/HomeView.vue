<template>
  <ion-content>
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1>⛪ Parish Dashboard</h1>
        <p v-if="userStore.user">Welcome, {{ userStore.user.nickname || userStore.user.email }}</p>
      </div>

      <!-- Quick Navigation -->
      <div class="quick-nav">
        <ion-button @click="$router.push('/pastoral-units')" fill="outline" expand="block">
          <ion-icon slot="start" :icon="peopleCircleOutline" />
          Pastoral Units (Unidades Pastorales)
        </ion-button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">
        <ion-spinner />
        <p>Loading parishes...</p>
      </div>

      <!-- No Parishes -->
      <div v-else-if="parishes.length === 0" class="empty-state">
        <ion-icon :icon="businessOutline" size="large" />
        <h2>Welcome to Parish Events</h2>
        <p>You're not part of any parish yet. Create a new parish or ask an admin to invite you.</p>
        <ion-button @click="showCreateParish = true" color="primary" fill="solid">
          <ion-icon slot="start" :icon="addOutline" />
          Create Parish
        </ion-button>
      </div>

      <!-- Parishes List -->
      <div v-else class="parishes-list">
        <div class="section-header">
          <h2>Your Parishes</h2>
          <ion-button @click="showCreateParish = true" fill="outline" size="small">
            <ion-icon slot="start" :icon="addOutline" />
            Add Parish
          </ion-button>
        </div>

        <ion-list>
          <ion-item 
            v-for="parish in parishes" 
            :key="parish.id"
            @click="selectParish(parish)"
            button
          >
            <ion-icon slot="start" :icon="businessOutline" />
            <ion-label>
              <h3>{{ parish.name }}</h3>
              <p v-if="parish.description">{{ parish.description }}</p>
              <ion-note color="medium">{{ parish.userRole }} • {{ parish.timezone }}</ion-note>
            </ion-label>
            <ion-badge slot="end" :color="getRoleColor(parish.userRole)">
              {{ parish.userRole }}
            </ion-badge>
          </ion-item>
        </ion-list>
      </div>

      <!-- Recent Activity (placeholder) -->
      <div v-if="parishes.length > 0" class="recent-activity">
        <h3>Recent Activity</h3>
        <ion-list>
          <ion-item>
            <ion-icon slot="start" :icon="calendarOutline" />
            <ion-label>
              <h4>Sunday Mass updated</h4>
              <p>St. Mary's Parish • 2 hours ago</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
    </div>

    <!-- Create Parish Modal -->
    <ion-modal :is-open="showCreateParish" @did-dismiss="showCreateParish = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Create Parish</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showCreateParish = false" fill="clear">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="modal-content">
          <ion-item>
            <ion-input
              v-model="newParish.name"
              label="Parish Name"
              label-placement="stacked"
              placeholder="e.g., St. Mary's Catholic Church"
              :maxlength="100"
              required
            />
          </ion-item>
          
          <ion-item>
            <ion-textarea
              v-model="newParish.description"
              label="Description (optional)"
              label-placement="stacked"
              placeholder="Brief description of your parish"
              :maxlength="500"
            />
          </ion-item>
          
          <ion-item>
            <ion-input
              v-model="newParish.website"
              label="Website (optional)"
              label-placement="stacked"
              placeholder="https://stmarys.org"
              type="url"
            />
          </ion-item>
          
          <ion-item>
            <ion-select
              v-model="newParish.timezone"
              label="Timezone"
              label-placement="stacked"
              placeholder="Select timezone"
            >
              <ion-select-option value="Europe/Madrid">Europe/Madrid</ion-select-option>
              <ion-select-option value="America/New_York">America/New_York</ion-select-option>
              <ion-select-option value="America/Los_Angeles">America/Los_Angeles</ion-select-option>
              <ion-select-option value="UTC">UTC</ion-select-option>
            </ion-select>
          </ion-item>
          
          <div class="modal-actions">
            <ion-button @click="showCreateParish = false" fill="clear" color="medium">
              Cancel
            </ion-button>
            <ion-button 
              @click="createParish" 
              :disabled="!newParish.name || creating"
              color="primary"
            >
              <ion-spinner v-if="creating" slot="start" />
              {{ creating ? 'Creating...' : 'Create Parish' }}
            </ion-button>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </ion-content>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { api } from '@/lib/api';
import {
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonBadge,
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  alertController
} from '@ionic/vue';
import {
  businessOutline,
  addOutline,
  calendarOutline,
  closeOutline,
  peopleCircleOutline
} from 'ionicons/icons';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(true);
const parishes = ref<any[]>([]);
const showCreateParish = ref(false);
const creating = ref(false);

const newParish = ref({
  name: '',
  description: '',
  website: '',
  timezone: 'UTC'
});

async function fetchParishes() {
  try {
    loading.value = true;
    const response = await api.get('/parish');
    parishes.value = response;
  } catch (error) {
    console.error('Failed to fetch parishes:', error);
    const alert = await alertController.create({
      header: 'Error',
      message: 'Failed to load parishes. Please try again.',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    loading.value = false;
  }
}

async function createParish() {
  try {
    creating.value = true;
    const parish = await api.post('/parish', newParish.value);
    parishes.value.push({ ...parish, userRole: 'admin' });
    showCreateParish.value = false;
    newParish.value = { name: '', description: '', website: '', timezone: 'UTC' };
  } catch (error) {
    console.error('Failed to create parish:', error);
    const alert = await alertController.create({
      header: 'Error',
      message: 'Failed to create parish. Please try again.',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    creating.value = false;
  }
}

function selectParish(parish: any) {
  router.push(`/parish/${parish.id}`);
}

function getRoleColor(role: string) {
  switch (role) {
    case 'admin': return 'danger';
    case 'manager': return 'warning';
    case 'viewer': return 'medium';
    default: return 'medium';
  }
}

onMounted(async () => {
  await fetchParishes();
});
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .container {
    padding: 0.5rem;
  }
  
  .header h1 {
    font-size: 1.5rem;
  }
  
  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.quick-nav {
  margin-bottom: 2rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  text-align: center;
}

.empty-state ion-icon {
  font-size: 4rem;
  color: var(--ion-color-medium);
}

.section-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  flex: 1;
}

.parishes-list {
  margin-bottom: 2rem;
}

.recent-activity {
  margin-top: 2rem;
}

.modal-content {
  padding: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem;
  margin-top: 2rem;
}
</style>