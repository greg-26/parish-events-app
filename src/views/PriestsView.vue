<template>
  <ion-content>
    <div class="container">
      <!-- Header with Add Button -->
      <div class="section-header">
        <h2>Parish Priests</h2>
        <ion-button v-if="canManage" @click="showCreatePriest = true" color="primary">
          <ion-icon slot="start" :icon="addOutline" />
          Add Priest
        </ion-button>
      </div>

      <div class="intro">
        <p>Manage priests who serve this parish. Add their contact information and assign them to celebrate events.</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">
        <ion-spinner />
        <p>Loading priests...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="priests.length === 0" class="empty-state">
        <ion-icon :icon="peopleOutline" size="large" />
        <h3>No Priests Yet</h3>
        <p v-if="canManage">Add priests to assign them to celebrate Masses and other events.</p>
        <p v-else>No priests have been added to this parish yet.</p>
        <ion-button v-if="canManage" @click="showCreatePriest = true" color="primary">
          <ion-icon slot="start" :icon="addOutline" />
          Add First Priest
        </ion-button>
      </div>

      <!-- Priests List -->
      <div v-else class="priests-list">
        <ion-list>
          <ion-item 
            v-for="priest in priests" 
            :key="priest.id"
            @click="editPriest(priest)"
            :button="canManage"
          >
            <ion-avatar slot="start">
              <ion-icon :icon="personCircleOutline" />
            </ion-avatar>
            
            <ion-label>
              <h3>{{ priest.title }} {{ priest.name }}</h3>
              <p v-if="priest.email">
                <ion-icon :icon="mailOutline" class="inline-icon" />
                {{ priest.email }}
              </p>
              <p v-if="priest.phone">
                <ion-icon :icon="callOutline" class="inline-icon" />
                {{ priest.phone }}
              </p>
              <ion-note color="medium" v-if="priest.ordainedDate">
                Ordained: {{ formatDate(priest.ordainedDate) }}
              </ion-note>
            </ion-label>
            
            <div slot="end" class="priest-badges">
              <ion-badge v-if="priest.isParishPriest" color="primary">
                Parish Priest
              </ion-badge>
              <ion-badge v-if="!priest.isActive" color="medium">
                Inactive
              </ion-badge>
              <ion-badge v-if="priest.languages?.length" color="secondary" outline>
                {{ priest.languages.length }} {{ priest.languages.length === 1 ? 'language' : 'languages' }}
              </ion-badge>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </div>

    <!-- Create Priest Modal -->
    <ion-modal :is-open="showCreatePriest" @did-dismiss="showCreatePriest = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ editMode ? 'Edit Priest' : 'Add Priest' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closePriestModal" fill="clear">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <form @submit.prevent="savePriest" class="priest-form">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>👨‍💼 Basic Information</h3>
            
            <ion-item>
              <ion-select
                v-model="priestForm.title"
                label="Title"
                label-placement="stacked"
                placeholder="Select title"
                fill="outline"
              >
                <ion-select-option value="Father">Father</ion-select-option>
                <ion-select-option value="Monsignor">Monsignor</ion-select-option>
                <ion-select-option value="Bishop">Bishop</ion-select-option>
                <ion-select-option value="Archbishop">Archbishop</ion-select-option>
                <ion-select-option value="Cardinal">Cardinal</ion-select-option>
                <ion-select-option value="Deacon">Deacon</ion-select-option>
              </ion-select>
            </ion-item>
            
            <ion-item>
              <ion-input
                v-model="priestForm.name"
                label="Full Name"
                label-placement="stacked"
                placeholder="e.g., John Smith"
                :maxlength="100"
                required
                fill="outline"
              />
            </ion-item>
            
            <ion-item>
              <ion-input
                v-model="priestForm.preferredName"
                label="Preferred Name (optional)"
                label-placement="stacked"
                placeholder="e.g., Father John"
                :maxlength="50"
                fill="outline"
              />
            </ion-item>
            
            <ion-item>
              <ion-checkbox 
                v-model="priestForm.isParishPriest" 
                slot="start"
              />
              <ion-label>Parish Priest (Pastor)</ion-label>
            </ion-item>
            
            <ion-item>
              <ion-checkbox 
                v-model="priestForm.isActive" 
                slot="start"
              />
              <ion-label>Currently Active</ion-label>
            </ion-item>
          </div>

          <!-- Contact Information -->
          <div class="form-section">
            <h3>📞 Contact Information</h3>
            
            <ion-item>
              <ion-input
                v-model="priestForm.email"
                label="Email Address"
                label-placement="stacked"
                placeholder="priest@parish.org"
                type="email"
                fill="outline"
              />
            </ion-item>
            
            <ion-item>
              <ion-input
                v-model="priestForm.phone"
                label="Phone Number"
                label-placement="stacked"
                placeholder="+1 234 567 8900"
                type="tel"
                fill="outline"
              />
            </ion-item>
          </div>

          <!-- Ministry Details -->
          <div class="form-section">
            <h3>⛪ Ministry Details</h3>
            
            <ion-item>
              <ion-input
                v-model="priestForm.ordainedDate"
                label="Ordination Date (optional)"
                label-placement="stacked"
                type="date"
                fill="outline"
              />
            </ion-item>
            
            <ion-item>
              <ion-input
                v-model="priestForm.diocese"
                label="Diocese (optional)"
                label-placement="stacked"
                placeholder="e.g., Diocese of Madrid"
                fill="outline"
              />
            </ion-item>
            
            <ion-item>
              <ion-select
                v-model="priestForm.languages"
                label="Languages Spoken"
                label-placement="stacked"
                multiple
                placeholder="Select languages"
                fill="outline"
              >
                <ion-select-option value="English">English</ion-select-option>
                <ion-select-option value="Spanish">Spanish</ion-select-option>
                <ion-select-option value="French">French</ion-select-option>
                <ion-select-option value="German">German</ion-select-option>
                <ion-select-option value="Italian">Italian</ion-select-option>
                <ion-select-option value="Portuguese">Portuguese</ion-select-option>
                <ion-select-option value="Polish">Polish</ion-select-option>
                <ion-select-option value="Latin">Latin</ion-select-option>
              </ion-select>
            </ion-item>
            
            <ion-item>
              <ion-textarea
                v-model="priestForm.specialties"
                label="Specialties/Notes (optional)"
                label-placement="stacked"
                placeholder="e.g., Youth ministry, Confessions in Spanish, Canon Law"
                :maxlength="500"
                fill="outline"
                auto-grow
              />
            </ion-item>
          </div>

          <!-- Submit Actions -->
          <div class="form-actions">
            <ion-button 
              @click="closePriestModal" 
              fill="clear" 
              color="medium"
              expand="block"
            >
              Cancel
            </ion-button>
            <ion-button 
              type="submit"
              :disabled="!isPriestFormValid || saving"
              color="primary"
              expand="block"
            >
              <ion-spinner v-if="saving" slot="start" />
              {{ saving ? 'Saving...' : (editMode ? 'Update Priest' : 'Add Priest') }}
            </ion-button>
          </div>
        </form>
      </ion-content>
    </ion-modal>
  </ion-content>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/lib/api';
import type { Priest } from '@/shared/types';
import {
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonBadge,
  IonAvatar,
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
  IonCheckbox,
  alertController,
  toastController
} from '@ionic/vue';
import {
  addOutline,
  peopleOutline,
  closeOutline,
  personCircleOutline,
  mailOutline,
  callOutline
} from 'ionicons/icons';

const route = useRoute();
const parishId = computed(() => route.params.id as string);

const canManage = ref(true); // TODO: Get from parent
const loading = ref(true);
const saving = ref(false);
const priests = ref<Priest[]>([]);
const showCreatePriest = ref(false);
const editingPriest = ref<Priest | null>(null);

const editMode = computed(() => !!editingPriest.value);

const priestForm = ref({
  title: 'Father',
  name: '',
  preferredName: '',
  email: '',
  phone: '',
  isParishPriest: false,
  isActive: true,
  ordainedDate: '',
  diocese: '',
  languages: [] as string[],
  specialties: ''
});

const isPriestFormValid = computed(() => {
  return priestForm.value.title && priestForm.value.name;
});

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function editPriest(priest: Priest) {
  if (!canManage.value) return;
  
  editingPriest.value = priest;
  priestForm.value = {
    title: priest.title,
    name: priest.name,
    preferredName: priest.preferredName || '',
    email: priest.email || '',
    phone: priest.phone || '',
    isParishPriest: priest.isParishPriest || false,
    isActive: priest.isActive !== false, // Default to true if undefined
    ordainedDate: priest.ordainedDate || '',
    diocese: priest.diocese || '',
    languages: priest.languages || [],
    specialties: priest.specialties || ''
  };
  showCreatePriest.value = true;
}

function closePriestModal() {
  showCreatePriest.value = false;
  editingPriest.value = null;
  resetPriestForm();
}

function resetPriestForm() {
  priestForm.value = {
    title: 'Father',
    name: '',
    preferredName: '',
    email: '',
    phone: '',
    isParishPriest: false,
    isActive: true,
    ordainedDate: '',
    diocese: '',
    languages: [],
    specialties: ''
  };
}

async function savePriest() {
  if (!isPriestFormValid.value) return;
  
  try {
    saving.value = true;
    
    const priestData: Partial<Priest> = {
      title: priestForm.value.title,
      name: priestForm.value.name,
      preferredName: priestForm.value.preferredName || undefined,
      email: priestForm.value.email || undefined,
      phone: priestForm.value.phone || undefined,
      isParishPriest: priestForm.value.isParishPriest,
      isActive: priestForm.value.isActive,
      ordainedDate: priestForm.value.ordainedDate || undefined,
      diocese: priestForm.value.diocese || undefined,
      languages: priestForm.value.languages.length > 0 ? priestForm.value.languages : undefined,
      specialties: priestForm.value.specialties || undefined
    };
    
    let result;
    if (editMode.value) {
      result = await api.put(`/parish/${parishId.value}/priests/${editingPriest.value!.id}`, priestData);
      
      // Update in local array
      const index = priests.value.findIndex(p => p.id === editingPriest.value!.id);
      if (index >= 0) {
        priests.value[index] = result;
      }
    } else {
      result = await api.post(`/parish/${parishId.value}/priests`, priestData);
      priests.value.push(result);
    }
    
    closePriestModal();
    
    const toast = await toastController.create({
      message: `Priest ${editMode.value ? 'updated' : 'added'} successfully!`,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
    
  } catch (error) {
    console.error('Failed to save priest:', error);
    const alert = await alertController.create({
      header: 'Error',
      message: `Failed to ${editMode.value ? 'update' : 'add'} priest. Please try again.`,
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    saving.value = false;
  }
}

async function fetchPriests() {
  try {
    loading.value = true;
    const response = await api.get(`/parish/${parishId.value}/priests`);
    priests.value = response;
  } catch (error) {
    console.error('Failed to fetch priests:', error);
    const alert = await alertController.create({
      header: 'Error',
      message: 'Failed to load priests. Please try again.',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await fetchPriests();
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

.section-header h2 {
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

.priest-badges {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-end;
}

.inline-icon {
  font-size: 0.9rem;
  margin-right: 0.25rem;
  vertical-align: middle;
}

.priest-form {
  padding: 0;
}

.form-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-bottom: 1px solid var(--ion-color-light);
}

.form-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ion-color-primary);
}

.form-actions {
  padding: 1rem;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 0.5rem;
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
  
  .section-header h2 {
    text-align: center;
    font-size: 1.5rem;
  }
  
  .form-actions {
    grid-template-columns: 1fr;
  }
  
  .form-section {
    padding: 0.75rem;
  }
  
  .priest-badges {
    align-items: center;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.125rem;
  }
  
  .priest-badges ion-badge {
    font-size: 0.75rem;
  }
}
</style>