<template>
  <ion-content>
    <div class="container">
      <!-- Header with Add Button -->
      <div class="section-header">
        <h2>Parish Locations</h2>
        <ion-button v-if="canManage" @click="showCreateLocation = true" color="primary">
          <ion-icon slot="start" :icon="addOutline" />
          Add Location
        </ion-button>
      </div>

      <div class="intro">
        <p>Manage your parish locations where events take place. Add churches, chapels, halls, and other venues.</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">
        <ion-spinner />
        <p>Loading locations...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="locations.length === 0" class="empty-state">
        <ion-icon :icon="locationOutline" size="large" />
        <h3>No Locations Yet</h3>
        <p v-if="canManage">Add your first location to start scheduling events.</p>
        <p v-else>No locations have been added to this parish yet.</p>
        <ion-button v-if="canManage" @click="showCreateLocation = true" color="primary">
          <ion-icon slot="start" :icon="addOutline" />
          Add First Location
        </ion-button>
      </div>

      <!-- Locations List -->
      <div v-else class="locations-list">
        <ion-list>
          <ion-item 
            v-for="location in locations" 
            :key="location.id"
            @click="editLocation(location)"
            :button="canManage"
          >
            <ion-icon slot="start" :icon="locationOutline" />
            
            <ion-label>
              <h3>{{ location.name }}</h3>
              <p v-if="location.address">
                {{ formatAddress(location.address) }}
              </p>
              <ion-note color="medium" v-if="location.coordinates">
                {{ location.coordinates.latitude.toFixed(4) }}, {{ location.coordinates.longitude.toFixed(4) }}
              </ion-note>
            </ion-label>
            
            <div slot="end" class="location-badges">
              <ion-badge v-if="location.isDefault" color="primary">
                Default
              </ion-badge>
              <ion-badge v-if="location.osmNode" color="success" outline>
                OSM
              </ion-badge>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </div>

    <!-- Create Location Modal -->
    <ion-modal :is-open="showCreateLocation" @did-dismiss="showCreateLocation = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ editMode ? 'Edit Location' : 'Add Location' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeLocationModal" fill="clear">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <form @submit.prevent="saveLocation" class="location-form">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>📍 Basic Information</h3>
            
            <ion-item>
              <ion-input
                v-model="locationForm.name"
                label="Location Name"
                label-placement="stacked"
                placeholder="e.g., Main Church, Parish Hall"
                :maxlength="100"
                required
                fill="outline"
              />
            </ion-item>
            
            <ion-item>
              <ion-checkbox 
                v-model="locationForm.isDefault" 
                slot="start"
              />
              <ion-label>Default location for events</ion-label>
            </ion-item>
          </div>

          <!-- Address -->
          <div class="form-section">
            <h3>🏠 Address</h3>
            
            <ion-item>
              <ion-input
                v-model="locationForm.address.streetAddress"
                label="Street Address"
                label-placement="stacked"
                placeholder="123 Main Street"
                fill="outline"
              />
            </ion-item>
            
            <div class="address-row">
              <ion-item>
                <ion-input
                  v-model="locationForm.address.addressLocality"
                  label="City"
                  label-placement="stacked"
                  placeholder="City"
                  fill="outline"
                />
              </ion-item>
              
              <ion-item>
                <ion-input
                  v-model="locationForm.address.postalCode"
                  label="Postal Code"
                  label-placement="stacked"
                  placeholder="12345"
                  fill="outline"
                />
              </ion-item>
            </div>
            
            <ion-item>
              <ion-input
                v-model="locationForm.address.addressRegion"
                label="State/Region"
                label-placement="stacked"
                placeholder="State or Region"
                fill="outline"
              />
            </ion-item>
            
            <ion-item>
              <ion-select
                v-model="locationForm.address.addressCountry"
                label="Country"
                label-placement="stacked"
                placeholder="Select country"
                fill="outline"
              >
                <ion-select-option value="ES">Spain</ion-select-option>
                <ion-select-option value="US">United States</ion-select-option>
                <ion-select-option value="MX">Mexico</ion-select-option>
                <ion-select-option value="AR">Argentina</ion-select-option>
                <ion-select-option value="CO">Colombia</ion-select-option>
                <ion-select-option value="PE">Peru</ion-select-option>
                <ion-select-option value="CL">Chile</ion-select-option>
              </ion-select>
            </ion-item>
          </div>

          <!-- Map Integration -->
          <div class="form-section">
            <h3>🗺️ Location Selection</h3>
            
            <div class="current-coordinates" v-if="locationForm.coordinates.latitude && locationForm.coordinates.longitude">
              <ion-item>
                <ion-label>
                  <h4>Selected Coordinates</h4>
                  <p>{{ locationForm.coordinates.latitude.toFixed(6) }}, {{ locationForm.coordinates.longitude.toFixed(6) }}</p>
                  <ion-note v-if="locationForm.osmNode">
                    OpenStreetMap Node: {{ locationForm.osmNode }}
                  </ion-note>
                </ion-label>
                <ion-chip slot="end" color="success" outline>
                  <ion-icon :icon="mapOutline" slot="start" />
                  Located
                </ion-chip>
              </ion-item>
            </div>
            
            <div class="map-actions">
              <ion-button 
                @click="showLocationPicker = true"
                color="primary"
                expand="block"
              >
                <ion-icon slot="start" :icon="mapOutline" />
                {{ (locationForm.coordinates.latitude && locationForm.coordinates.longitude) ? 
                   'Change Location on Map' : 'Select Location on Map' }}
              </ion-button>
              
              <ion-button 
                v-if="locationForm.coordinates.latitude && locationForm.coordinates.longitude"
                @click="clearCoordinates"
                fill="clear"
                color="medium"
                expand="block"
              >
                <ion-icon slot="start" :icon="trashOutline" />
                Clear Coordinates
              </ion-button>
            </div>
          </div>

          <!-- Submit Actions -->
          <div class="form-actions">
            <ion-button 
              @click="closeLocationModal" 
              fill="clear" 
              color="medium"
              expand="block"
            >
              Cancel
            </ion-button>
            <ion-button 
              type="submit"
              :disabled="!isLocationFormValid || saving"
              color="primary"
              expand="block"
            >
              <ion-spinner v-if="saving" slot="start" />
              {{ saving ? 'Saving...' : (editMode ? 'Update Location' : 'Add Location') }}
            </ion-button>
          </div>
        </form>
      </ion-content>
    </ion-modal>

    <!-- Location Picker Modal -->
    <ion-modal :is-open="showLocationPicker" @did-dismiss="showLocationPicker = false" class="location-picker-modal">
      <ion-header>
        <ion-toolbar>
          <ion-title>Select Location on Map</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showLocationPicker = false" fill="clear">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <LocationPicker
          :initial-location="getInitialMapLocation()"
          :country-code="locationForm.address.addressCountry?.toLowerCase()"
          @location-selected="onLocationSelected"
          @cancel="showLocationPicker = false"
        />
      </ion-content>
    </ion-modal>
  </ion-content>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/lib/api';
import type { ParishLocation, PostalAddress, GeoCoordinates } from '@/shared/types';
import LocationPicker from '@/components/LocationPicker.vue';
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
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonChip,
  alertController,
  toastController
} from '@ionic/vue';
import {
  addOutline,
  locationOutline,
  closeOutline,
  mapOutline,
  trashOutline
} from 'ionicons/icons';

const route = useRoute();
const parishId = computed(() => route.params.id as string);

const canManage = ref(true); // TODO: Get from parent
const loading = ref(true);
const saving = ref(false);
const locations = ref<ParishLocation[]>([]);
const showCreateLocation = ref(false);
const editingLocation = ref<ParishLocation | null>(null);
const showLocationPicker = ref(false);

const editMode = computed(() => !!editingLocation.value);

const locationForm = ref({
  name: '',
  isDefault: false,
  address: {
    streetAddress: '',
    addressLocality: '',
    postalCode: '',
    addressRegion: '',
    addressCountry: 'ES'
  } as PostalAddress,
  osmNode: '',
  coordinates: {
    latitude: null as number | null,
    longitude: null as number | null
  }
});

const isLocationFormValid = computed(() => {
  return locationForm.value.name && locationForm.value.address.addressCountry;
});

function formatAddress(address: PostalAddress): string {
  const parts = [
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.postalCode
  ].filter(Boolean);
  
  return parts.join(', ');
}

function editLocation(location: ParishLocation) {
  if (!canManage.value) return;
  
  editingLocation.value = location;
  locationForm.value = {
    name: location.name,
    isDefault: location.isDefault || false,
    address: { ...location.address },
    osmNode: location.osmNode || '',
    coordinates: {
      latitude: location.coordinates?.latitude || null,
      longitude: location.coordinates?.longitude || null
    }
  };
  showCreateLocation.value = true;
}

function closeLocationModal() {
  showCreateLocation.value = false;
  editingLocation.value = null;
  resetLocationForm();
}

function resetLocationForm() {
  locationForm.value = {
    name: '',
    isDefault: false,
    address: {
      streetAddress: '',
      addressLocality: '',
      postalCode: '',
      addressRegion: '',
      addressCountry: 'ES'
    },
    osmNode: '',
    coordinates: {
      latitude: null,
      longitude: null
    }
  };
}

async function saveLocation() {
  if (!isLocationFormValid.value) return;
  
  try {
    saving.value = true;
    
    const locationData: Partial<ParishLocation> = {
      name: locationForm.value.name,
      isDefault: locationForm.value.isDefault,
      address: locationForm.value.address,
      osmNode: locationForm.value.osmNode || undefined,
      coordinates: (locationForm.value.coordinates.latitude && locationForm.value.coordinates.longitude) ? {
        latitude: locationForm.value.coordinates.latitude,
        longitude: locationForm.value.coordinates.longitude
      } : undefined
    };
    
    let result;
    if (editMode.value) {
      result = await api.put(`/parish/${parishId.value}/locations/${editingLocation.value!.id}`, locationData);
      
      // Update in local array
      const index = locations.value.findIndex(l => l.id === editingLocation.value!.id);
      if (index >= 0) {
        locations.value[index] = result;
      }
    } else {
      result = await api.post(`/parish/${parishId.value}/locations`, locationData);
      locations.value.push(result);
    }
    
    closeLocationModal();
    
    const toast = await toastController.create({
      message: `Location ${editMode.value ? 'updated' : 'added'} successfully!`,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
    
  } catch (error) {
    console.error('Failed to save location:', error);
    const alert = await alertController.create({
      header: 'Error',
      message: `Failed to ${editMode.value ? 'update' : 'add'} location. Please try again.`,
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    saving.value = false;
  }
}

async function fetchLocations() {
  try {
    loading.value = true;
    const response = await api.get(`/parish/${parishId.value}/locations`);
    locations.value = response;
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    const alert = await alertController.create({
      header: 'Error',
      message: 'Failed to load locations. Please try again.',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    loading.value = false;
  }
}

function getInitialMapLocation(): GeoCoordinates | undefined {
  if (locationForm.value.coordinates.latitude && locationForm.value.coordinates.longitude) {
    return {
      latitude: locationForm.value.coordinates.latitude,
      longitude: locationForm.value.coordinates.longitude
    };
  }
  return undefined;
}

function onLocationSelected(selectedLocation: any) {
  // Update form with selected location data
  locationForm.value.coordinates.latitude = selectedLocation.coordinates.latitude;
  locationForm.value.coordinates.longitude = selectedLocation.coordinates.longitude;
  
  if (selectedLocation.osmId) {
    locationForm.value.osmNode = String(selectedLocation.osmId);
  }
  
  // If the user selected a named location, suggest it as the location name
  if (selectedLocation.name && !locationForm.value.name) {
    locationForm.value.name = selectedLocation.name;
  }
  
  // Auto-fill address if provided and current address is empty
  if (selectedLocation.postalAddress) {
    const pa = selectedLocation.postalAddress;
    if (!locationForm.value.address.streetAddress && pa.streetAddress) {
      locationForm.value.address.streetAddress = pa.streetAddress;
    }
    if (!locationForm.value.address.addressLocality && pa.addressLocality) {
      locationForm.value.address.addressLocality = pa.addressLocality;
    }
    if (!locationForm.value.address.postalCode && pa.postalCode) {
      locationForm.value.address.postalCode = pa.postalCode;
    }
    if (!locationForm.value.address.addressRegion && pa.addressRegion) {
      locationForm.value.address.addressRegion = pa.addressRegion;
    }
    if (!locationForm.value.address.addressCountry && pa.addressCountry) {
      locationForm.value.address.addressCountry = pa.addressCountry;
    }
  }
  
  showLocationPicker.value = false;
}

function clearCoordinates() {
  locationForm.value.coordinates.latitude = null;
  locationForm.value.coordinates.longitude = null;
  locationForm.value.osmNode = '';
}

onMounted(async () => {
  await fetchLocations();
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

.location-badges {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-end;
}

.location-form {
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

.address-row,
.coordinates-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.map-actions {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
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
  
  .address-row,
  .coordinates-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    grid-template-columns: 1fr;
  }
  
  .form-section {
    padding: 0.75rem;
  }
  
  .location-badges {
    align-items: center;
    flex-direction: row;
  }
}

:global(.location-picker-modal) {
  --height: 90vh;
  --width: 90vw;
  --max-width: 900px;
  --border-radius: 12px;
}

:global(.location-picker-modal ion-content) {
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.current-coordinates {
  margin-bottom: 1rem;
}

.map-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  :global(.location-picker-modal) {
    --height: 95vh;
    --width: 95vw;
  }
}
</style>