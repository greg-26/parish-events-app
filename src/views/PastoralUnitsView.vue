<template>
  <ion-content>
    <div class="container">
      <!-- Header -->
      <div class="section-header">
        <h1>🤝 Pastoral Units</h1>
        <ion-button v-if="canCreateUnit" @click="showCreateUnit = true" color="primary">
          <ion-icon slot="start" :icon="addOutline" />
          Create Pastoral Unit
        </ion-button>
      </div>

      <div class="intro">
        <p>
          Pastoral Units (Unidades Pastorales) allow multiple parishes to share priests and coordinate schedules.
          Perfect for parishes served by the same team of clergy.
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">
        <ion-spinner />
        <p>Loading pastoral units...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="pastoralUnits.length === 0" class="empty-state">
        <ion-icon :icon="peopleCircleOutline" size="large" />
        <h2>No Pastoral Units</h2>
        <p v-if="canCreateUnit">Create a pastoral unit to group parishes that share priests and coordinate schedules.</p>
        <p v-else>No pastoral units have been created yet.</p>
        <ion-button v-if="canCreateUnit" @click="showCreateUnit = true" color="primary">
          <ion-icon slot="start" :icon="addOutline" />
          Create First Pastoral Unit
        </ion-button>
      </div>

      <!-- Pastoral Units List -->
      <div v-else class="units-list">
        <ion-list>
          <ion-item 
            v-for="unit in pastoralUnits" 
            :key="unit.id"
            @click="selectUnit(unit)"
            button
          >
            <ion-icon slot="start" :icon="peopleCircleOutline" />
            
            <ion-label>
              <h3>{{ unit.name }}</h3>
              <p v-if="unit.description">{{ unit.description }}</p>
              <ion-note color="medium">
                {{ unit.parishes.length }} {{ unit.parishes.length === 1 ? 'parish' : 'parishes' }} • 
                {{ unit.sharedPriests.length }} {{ unit.sharedPriests.length === 1 ? 'priest' : 'priests' }}
              </ion-note>
              
              <!-- Parish list -->
              <div v-if="unit.parishes.length > 0" class="parishes-chips">
                <ion-chip 
                  v-for="parishId in unit.parishes.slice(0, 3)" 
                  :key="parishId"
                  color="primary" 
                  outline
                  size="small"
                >
                  {{ getParishName(parishId) }}
                </ion-chip>
                <ion-chip 
                  v-if="unit.parishes.length > 3"
                  color="medium" 
                  outline
                  size="small"
                >
                  +{{ unit.parishes.length - 3 }} more
                </ion-chip>
              </div>
            </ion-label>

            <!-- Coordinator badge -->
            <div slot="end" v-if="unit.coordinator">
              <ion-badge color="warning">
                Coordinator: {{ getPriestName(unit.coordinator) }}
              </ion-badge>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </div>

    <!-- Create Pastoral Unit Modal -->
    <ion-modal :is-open="showCreateUnit" @did-dismiss="showCreateUnit = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Create Pastoral Unit</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showCreateUnit = false" fill="clear">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="modal-content">
          <ion-item>
            <ion-input
              v-model="newUnit.name"
              label="Pastoral Unit Name"
              label-placement="stacked"
              placeholder="e.g., San Juan Valley Pastoral Unit"
              :maxlength="100"
              required
            />
          </ion-item>
          
          <ion-item>
            <ion-textarea
              v-model="newUnit.description"
              label="Description (optional)"
              label-placement="stacked"
              placeholder="Brief description of the pastoral unit"
              :maxlength="500"
            />
          </ion-item>

          <div class="section">
            <h4>Select Parishes to Include</h4>
            <p class="help-text">Choose parishes that will be part of this pastoral unit. They will share priests and coordinate schedules.</p>
            
            <ion-list>
              <ion-item v-for="parish in availableParishes" :key="parish.id">
                <ion-checkbox 
                  slot="start" 
                  :checked="newUnit.parishes.includes(parish.id)"
                  @ion-change="toggleParish(parish.id, $event.detail.checked)"
                />
                <ion-label>
                  <h4>{{ parish.name }}</h4>
                  <p v-if="parish.description">{{ parish.description }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
          
          <div class="modal-actions">
            <ion-button @click="showCreateUnit = false" fill="clear" color="medium">
              Cancel
            </ion-button>
            <ion-button 
              @click="createPastoralUnit" 
              :disabled="!newUnit.name || newUnit.parishes.length < 2 || creating"
              color="primary"
            >
              <ion-spinner v-if="creating" slot="start" />
              {{ creating ? 'Creating...' : 'Create Pastoral Unit' }}
            </ion-button>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </ion-content>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { api } from '@/lib/api';
import type { PastoralUnit } from '@/shared/types';
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
  IonCheckbox,
  IonChip,
  alertController
} from '@ionic/vue';
import {
  addOutline,
  peopleCircleOutline,
  closeOutline
} from 'ionicons/icons';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(true);
const pastoralUnits = ref<PastoralUnit[]>([]);
const availableParishes = ref<any[]>([]);
const showCreateUnit = ref(false);
const creating = ref(false);

// TODO: Check permissions properly
const canCreateUnit = computed(() => true); // For now, allow all users

const newUnit = ref({
  name: '',
  description: '',
  parishes: [] as string[]
});

// Mock data for now - these should come from API calls
const parishNames = ref<Record<string, string>>({});
const priestNames = ref<Record<string, string>>({});

function getParishName(parishId: string): string {
  return parishNames.value[parishId] || 'Unknown Parish';
}

function getPriestName(priestId: string): string {
  return priestNames.value[priestId] || 'Unknown Priest';
}

function toggleParish(parishId: string, checked: boolean) {
  if (checked) {
    newUnit.value.parishes.push(parishId);
  } else {
    newUnit.value.parishes = newUnit.value.parishes.filter(id => id !== parishId);
  }
}

async function fetchPastoralUnits() {
  try {
    loading.value = true;
    // TODO: Implement API call
    // const response = await api.get('/pastoral-units');
    // pastoralUnits.value = response;
    pastoralUnits.value = []; // Mock empty for now
  } catch (error) {
    console.error('Failed to fetch pastoral units:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchAvailableParishes() {
  try {
    const response = await api.get('/parish');
    // Filter parishes that are not already in a pastoral unit
    availableParishes.value = response.filter((parish: any) => !parish.pastoralUnitId);
    
    // Build parish names lookup
    parishNames.value = {};
    response.forEach((parish: any) => {
      parishNames.value[parish.id] = parish.name;
    });
  } catch (error) {
    console.error('Failed to fetch parishes:', error);
  }
}

async function createPastoralUnit() {
  try {
    creating.value = true;
    // TODO: Implement API call
    // const unit = await api.post('/pastoral-units', newUnit.value);
    // pastoralUnits.value.push(unit);
    
    showCreateUnit.value = false;
    newUnit.value = { name: '', description: '', parishes: [] };
    
    const alert = await alertController.create({
      header: 'Success',
      message: 'Pastoral unit created successfully!',
      buttons: ['OK']
    });
    await alert.present();
  } catch (error) {
    console.error('Failed to create pastoral unit:', error);
    const alert = await alertController.create({
      header: 'Error',
      message: 'Failed to create pastoral unit. Please try again.',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    creating.value = false;
  }
}

function selectUnit(unit: PastoralUnit) {
  router.push(`/pastoral-unit/${unit.id}`);
}

onMounted(async () => {
  await Promise.all([
    fetchPastoralUnits(),
    fetchAvailableParishes()
  ]);
});
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h1 {
  margin: 0;
}

.intro {
  background: var(--ion-color-light);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.intro p {
  margin: 0;
  color: var(--ion-color-medium);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  gap: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
}

.empty-state ion-icon {
  font-size: 4rem;
  color: var(--ion-color-medium);
}

.parishes-chips {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.modal-content {
  padding: 1rem;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .container {
    padding: 0.5rem;
  }
  
  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .section-header h1 {
    font-size: 1.5rem;
    text-align: center;
  }
  
  .parishes-chips {
    gap: 0.125rem;
  }
  
  .parishes-chips ion-chip {
    font-size: 0.75rem;
  }
  
  .modal-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .modal-actions ion-button {
    margin: 0;
  }
}

.section {
  margin: 2rem 0;
}

.section h4 {
  margin: 0 0 0.5rem 0;
}

.help-text {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem;
  margin-top: 2rem;
}
</style>