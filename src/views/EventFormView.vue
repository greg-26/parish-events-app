<template>
  <ion-modal :is-open="isOpen" @did-dismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ editMode ? 'Edit Event' : 'Create Event' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')" fill="clear">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <form @submit.prevent="handleSubmit" class="event-form">
        <!-- Basic Information -->
        <div class="form-section">
          <h3>📝 Basic Information</h3>
          
          <ion-item>
            <ion-input
              v-model="formData.name"
              label="Event Name"
              label-placement="stacked"
              placeholder="e.g., Sunday Mass, Adoration, Rosary"
              :maxlength="100"
              required
              fill="outline"
            />
          </ion-item>
          
          <ion-item>
            <ion-select
              v-model="formData.eventType"
              label="Event Type"
              label-placement="stacked"
              placeholder="Select type"
              fill="outline"
            >
              <ion-select-option value="mass">Mass</ion-select-option>
              <ion-select-option value="adoration">Eucharistic Adoration</ion-select-option>
              <ion-select-option value="confession">Confession</ion-select-option>
              <ion-select-option value="vespers">Vespers/Evening Prayer</ion-select-option>
              <ion-select-option value="rosary">Rosary</ion-select-option>
              <ion-select-option value="stations">Stations of the Cross</ion-select-option>
              <ion-select-option value="novena">Novena</ion-select-option>
              <ion-select-option value="retreat">Retreat</ion-select-option>
              <ion-select-option value="catechesis">Catechesis/Religious Education</ion-select-option>
              <ion-select-option value="youth">Youth Ministry</ion-select-option>
              <ion-select-option value="meeting">Parish Meeting</ion-select-option>
              <ion-select-option value="celebration">Celebration/Festival</ion-select-option>
              <ion-select-option value="wedding">Wedding</ion-select-option>
              <ion-select-option value="funeral">Funeral/Memorial</ion-select-option>
              <ion-select-option value="baptism">Baptism</ion-select-option>
              <ion-select-option value="confirmation">Confirmation</ion-select-option>
              <ion-select-option value="other">Other</ion-select-option>
            </ion-select>
          </ion-item>

          <!-- Liturgical Calendar Integration -->
          <div v-if="liturgicalInfo" class="liturgical-info">
            <ion-card>
              <ion-card-header>
                <ion-card-title>
                  <ion-icon :icon="sparklesOutline" />
                  Liturgical Calendar
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="liturgical-details">
                  <ion-chip :color="getLiturgicalColorCode(liturgicalInfo.color)" outline>
                    {{ liturgicalInfo.season }}
                  </ion-chip>
                  <ion-chip color="medium" outline>
                    {{ liturgicalInfo.rank }}
                  </ion-chip>
                  <p><strong>{{ liturgicalInfo.name }}</strong></p>
                  
                  <!-- Event Suggestions -->
                  <div v-if="liturgicalInfo.suggestedEvents?.length" class="event-suggestions">
                    <h4>✨ Suggested Events</h4>
                    <div class="suggestion-chips">
                      <ion-chip 
                        v-for="suggestion in liturgicalInfo.suggestedEvents" 
                        :key="suggestion.name"
                        :color="getSuggestionColor(suggestion.priority)"
                        @click="applySuggestion(suggestion)"
                        button
                      >
                        <ion-icon :icon="timeOutline" slot="start" />
                        {{ suggestion.name }}
                        <span v-if="suggestion.recommendedTime"> • {{ suggestion.recommendedTime }}</span>
                      </ion-chip>
                    </div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- Conflict Detection -->
          <div v-if="conflicts.length > 0" class="conflict-detection">
            <ion-card>
              <ion-card-header>
                <ion-card-title>
                  <ion-icon :icon="warningOutline" />
                  Scheduling Analysis
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="conflicts-list">
                  <ion-item 
                    v-for="conflict in conflicts" 
                    :key="`${conflict.type}-${conflict.message}`"
                    class="conflict-item"
                  >
                    <ion-icon 
                      slot="start" 
                      :icon="getConflictIcon(conflict.type)" 
                      :color="getConflictColor(conflict.severity)"
                    />
                    <ion-label>
                      <h4 :class="`conflict-${conflict.severity}`">
                        {{ conflict.message }}
                      </h4>
                      <div v-if="conflict.suggestions?.length" class="conflict-suggestions">
                        <ion-note color="medium">Suggestions:</ion-note>
                        <ul>
                          <li v-for="suggestion in conflict.suggestions" :key="suggestion">
                            {{ suggestion }}
                          </li>
                        </ul>
                      </div>
                      <div v-if="conflict.conflictingEvents.length > 0" class="conflicting-events">
                        <ion-note color="medium">
                          Conflicts with {{ conflict.conflictingEvents.length }} 
                          {{ conflict.conflictingEvents.length === 1 ? 'event' : 'events' }}
                        </ion-note>
                      </div>
                    </ion-label>
                    <ion-badge 
                      slot="end" 
                      :color="getConflictColor(conflict.severity)"
                    >
                      {{ conflict.severity.toUpperCase() }}
                    </ion-badge>
                  </ion-item>
                </div>
              </ion-card-content>
            </ion-card>
          </div>
          
          <ion-item>
            <ion-textarea
              v-model="formData.description"
              label="Description (optional)"
              label-placement="stacked"
              placeholder="Brief description of the event"
              :maxlength="500"
              fill="outline"
              auto-grow
            />
          </ion-item>
        </div>

        <!-- Location -->
        <div class="form-section">
          <h3>📍 Location</h3>
          
          <ion-item>
            <ion-select
              v-model="formData.locationId"
              label="Location"
              label-placement="stacked"
              placeholder="Select location"
              fill="outline"
            >
              <ion-select-option 
                v-for="location in locations" 
                :key="location.id" 
                :value="location.id"
              >
                {{ location.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          
          <div class="location-actions">
            <ion-button 
              @click="showAddLocation = true" 
              fill="clear" 
              size="small"
            >
              <ion-icon slot="start" :icon="addOutline" />
              Add New Location
            </ion-button>
          </div>
        </div>

        <!-- Scheduling -->
        <div class="form-section">
          <h3>🗓️ Schedule</h3>
          
          <ion-item>
            <ion-checkbox 
              v-model="formData.isRecurring" 
              slot="start"
            />
            <ion-label>Recurring Event</ion-label>
          </ion-item>
          
          <div v-if="!formData.isRecurring" class="specific-date-section">
            <ion-item>
              <ion-datetime-button datetime="specific-date" />
              <ion-modal :keep-contents-mounted="true">
                <ion-datetime
                  id="specific-date"
                  v-model="formData.specificDate"
                  presentation="date"
                />
              </ion-modal>
            </ion-item>
          </div>
          
          <div v-else class="recurring-section">
            <ion-item>
              <ion-select
                v-model="formData.schedule.byDay"
                label="Days"
                label-placement="stacked"
                multiple
                placeholder="Select days"
                fill="outline"
              >
                <ion-select-option value="Monday">Monday</ion-select-option>
                <ion-select-option value="Tuesday">Tuesday</ion-select-option>
                <ion-select-option value="Wednesday">Wednesday</ion-select-option>
                <ion-select-option value="Thursday">Thursday</ion-select-option>
                <ion-select-option value="Friday">Friday</ion-select-option>
                <ion-select-option value="Saturday">Saturday</ion-select-option>
                <ion-select-option value="Sunday">Sunday</ion-select-option>
              </ion-select>
            </ion-item>
            
            <ion-item>
              <ion-select
                v-model="formData.schedule.repeatFrequency"
                label="Frequency"
                label-placement="stacked"
                placeholder="How often"
                fill="outline"
              >
                <ion-select-option value="P1W">Weekly</ion-select-option>
                <ion-select-option value="P1M">Monthly</ion-select-option>
                <ion-select-option value="P1Y">Yearly</ion-select-option>
              </ion-select>
            </ion-item>
            
            <div class="date-range">
              <ion-item>
                <ion-input
                  v-model="formData.schedule.startDate"
                  label="Start Date"
                  label-placement="stacked"
                  type="date"
                  fill="outline"
                />
              </ion-item>
              
              <ion-item>
                <ion-input
                  v-model="formData.schedule.endDate"
                  label="End Date (optional)"
                  label-placement="stacked"
                  type="date"
                  fill="outline"
                />
              </ion-item>
            </div>
          </div>
          
          <!-- Time -->
          <div class="time-section">
            <ion-item>
              <ion-input
                v-model="formData.schedule.startTime"
                label="Start Time"
                label-placement="stacked"
                type="time"
                fill="outline"
                required
              />
            </ion-item>
            
            <ion-item>
              <ion-input
                v-model="formData.schedule.endTime"
                label="End Time (optional)"
                label-placement="stacked"
                type="time"
                fill="outline"
              />
            </ion-item>
          </div>
        </div>

        <!-- Priests -->
        <div class="form-section">
          <h3>👨‍💼 Priests</h3>
          
          <ion-item>
            <ion-select
              v-model="formData.celebrantId"
              label="Main Celebrant"
              label-placement="stacked"
              placeholder="Select celebrant"
              fill="outline"
            >
              <ion-select-option 
                v-for="priest in priests" 
                :key="priest.id" 
                :value="priest.id"
              >
                {{ priest.title }} {{ priest.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          
          <ion-item>
            <ion-select
              v-model="formData.assistantIds"
              label="Assistants (optional)"
              label-placement="stacked"
              placeholder="Select assistants"
              multiple
              fill="outline"
            >
              <ion-select-option 
                v-for="priest in priests" 
                :key="priest.id" 
                :value="priest.id"
              >
                {{ priest.title }} {{ priest.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          
          <div class="priest-actions">
            <ion-button 
              @click="showAddPriest = true" 
              fill="clear" 
              size="small"
            >
              <ion-icon slot="start" :icon="addOutline" />
              Add New Priest
            </ion-button>
          </div>
        </div>

        <!-- Advanced -->
        <div class="form-section">
          <h3>⚙️ Advanced</h3>
          
          <ion-item>
            <ion-input
              v-model="formData.additionalType"
              label="Wikidata Type URL (optional)"
              label-placement="stacked"
              placeholder="https://www.wikidata.org/wiki/Q132612"
              fill="outline"
            />
          </ion-item>
          
          <ion-item>
            <ion-input
              v-model="formData.image"
              label="Image URL (optional)"
              label-placement="stacked"
              placeholder="https://example.com/image.jpg"
              type="url"
              fill="outline"
            />
          </ion-item>
        </div>

        <!-- Submit Actions -->
        <div class="form-actions">
          <ion-button 
            @click="$emit('close')" 
            fill="clear" 
            color="medium"
            expand="block"
          >
            Cancel
          </ion-button>
          <ion-button 
            type="submit"
            :disabled="!isFormValid || saving"
            color="primary"
            expand="block"
          >
            <ion-spinner v-if="saving" slot="start" />
            {{ saving ? 'Saving...' : (editMode ? 'Update Event' : 'Create Event') }}
          </ion-button>
        </div>
      </form>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { api } from '@/lib/api';
import { liturgicalCalendar } from '@/services/liturgicalCalendar';
import { conflictDetection } from '@/services/conflictDetection';
import type { ParishEvent, EventSchedule, WeekDay, EventType } from '@/shared/types';
import type { EventSuggestion, LiturgicalDay } from '@/services/liturgicalCalendar';
import type { ScheduleConflict } from '@/services/conflictDetection';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonLabel,
  IonDatetimeButton,
  IonDatetime,
  IonSpinner,
  IonChip,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  alertController,
  toastController
} from '@ionic/vue';
import {
  closeOutline,
  addOutline,
  sparklesOutline,
  calendarOutline,
  timeOutline,
  warningOutline,
  peopleOutline,
  informationCircleOutline
} from 'ionicons/icons';

interface Props {
  isOpen: boolean;
  parishId: string;
  event?: ParishEvent | null;
  locations: any[];
  priests: any[];
  pendingSuggestion?: {suggestion: EventSuggestion, date: string} | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'saved', event: ParishEvent): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const editMode = computed(() => !!props.event);
const saving = ref(false);
const showAddLocation = ref(false);
const showAddPriest = ref(false);
const liturgicalInfo = ref<LiturgicalDay | null>(null);
const conflicts = ref<ScheduleConflict[]>([]);
const checkingConflicts = ref(false);

const formData = ref({
  name: '',
  eventType: 'mass' as EventType,
  description: '',
  locationId: '',
  celebrantId: '',
  assistantIds: [] as string[],
  isRecurring: true,
  specificDate: '',
  schedule: {
    startTime: '09:00',
    endTime: '',
    byDay: [] as WeekDay[],
    repeatFrequency: 'P1W' as any,
    startDate: '',
    endDate: '',
    exceptDates: []
  } as EventSchedule,
  additionalType: '',
  image: ''
});

const isFormValid = computed(() => {
  return formData.value.name && 
         formData.value.eventType && 
         formData.value.locationId &&
         formData.value.schedule.startTime &&
         (formData.value.isRecurring ? 
           formData.value.schedule.byDay.length > 0 : 
           formData.value.specificDate);
});

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetForm();
  }
});

// Watch for date changes to update liturgical info
watch(() => formData.value.specificDate, (newDate) => {
  if (newDate) {
    updateLiturgicalInfo(new Date(newDate));
  }
});

// Watch for recurring schedule changes
watch(() => formData.value.schedule.startDate, (newStartDate) => {
  if (newStartDate && formData.value.isRecurring) {
    updateLiturgicalInfo(new Date(newStartDate));
  }
  checkForConflicts();
});

// Watch for form changes that might create conflicts
watch(() => [
  formData.value.locationId,
  formData.value.celebrantId,
  formData.value.assistantIds,
  formData.value.schedule.startTime,
  formData.value.schedule.endTime,
  formData.value.schedule.byDay,
  formData.value.specificDate,
  formData.value.isRecurring
], () => {
  checkForConflicts();
}, { deep: true });

function resetForm() {
  if (props.event) {
    // Edit mode - populate form
    formData.value = {
      name: props.event.name,
      eventType: props.event.eventType,
      description: props.event.description || '',
      locationId: props.event.locationId,
      celebrantId: props.event.celebrantId || '',
      assistantIds: props.event.assistantIds || [],
      isRecurring: props.event.isRecurring,
      specificDate: props.event.specificDate || '',
      schedule: props.event.schedule || {
        startTime: '09:00',
        endTime: '',
        byDay: [],
        repeatFrequency: 'P1W',
        startDate: '',
        endDate: '',
        exceptDates: []
      },
      additionalType: props.event.additionalType || '',
      image: props.event.image || ''
    };
  } else if (props.pendingSuggestion) {
    // Create from suggestion mode
    const { suggestion, date } = props.pendingSuggestion;
    formData.value = {
      name: suggestion.name,
      eventType: suggestion.type as EventType,
      description: suggestion.description,
      locationId: '',
      celebrantId: '',
      assistantIds: [],
      isRecurring: false,
      specificDate: date,
      schedule: {
        startTime: suggestion.recommendedTime || '09:00',
        endTime: '',
        byDay: [],
        repeatFrequency: 'P1W',
        startDate: '',
        endDate: '',
        exceptDates: []
      },
      additionalType: '',
      image: ''
    };
    
    // Set default location if available
    if (props.locations.length > 0) {
      const defaultLocation = props.locations.find(l => l.isDefault) || props.locations[0];
      formData.value.locationId = defaultLocation.id;
    }
  } else {
    // Create mode - reset form
    formData.value = {
      name: '',
      eventType: 'mass',
      description: '',
      locationId: '',
      celebrantId: '',
      assistantIds: [],
      isRecurring: true,
      specificDate: '',
      schedule: {
        startTime: '09:00',
        endTime: '',
        byDay: [],
        repeatFrequency: 'P1W',
        startDate: '',
        endDate: '',
        exceptDates: []
      },
      additionalType: '',
      image: ''
    };
  }
}

async function handleSubmit() {
  if (!isFormValid.value) return;
  
  try {
    saving.value = true;
    
    const eventData = {
      ...formData.value,
      schedule: formData.value.isRecurring ? formData.value.schedule : undefined
    };
    
    let result;
    if (editMode.value) {
      result = await api.put(`/parish/${props.parishId}/events/${props.event!.id}`, eventData);
    } else {
      result = await api.post(`/parish/${props.parishId}/events`, eventData);
    }
    
    emit('saved', result);
    emit('close');
    
    const toast = await toastController.create({
      message: `Event ${editMode.value ? 'updated' : 'created'} successfully!`,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
    
  } catch (error) {
    console.error('Failed to save event:', error);
    const alert = await alertController.create({
      header: 'Error',
      message: `Failed to ${editMode.value ? 'update' : 'create'} event. Please try again.`,
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    saving.value = false;
  }
}

function updateLiturgicalInfo(date: Date) {
  liturgicalInfo.value = liturgicalCalendar.getLiturgicalDay(date);
}

function getLiturgicalColorCode(liturgicalColor: string): string {
  const colorMap: Record<string, string> = {
    'white': 'light',
    'red': 'danger',
    'green': 'success',
    'purple': 'secondary',
    'rose': 'warning',
    'black': 'dark'
  };
  return colorMap[liturgicalColor] || 'medium';
}

function getSuggestionColor(priority: string): string {
  const priorityMap: Record<string, string> = {
    'high': 'primary',
    'medium': 'secondary',
    'low': 'tertiary'
  };
  return priorityMap[priority] || 'medium';
}

function applySuggestion(suggestion: EventSuggestion) {
  formData.value.name = suggestion.name;
  formData.value.eventType = suggestion.type as EventType;
  formData.value.description = suggestion.description;
  
  if (suggestion.recommendedTime) {
    formData.value.schedule.startTime = suggestion.recommendedTime;
  }
}

async function checkForConflicts() {
  // Debounce conflict checking
  if (checkingConflicts.value) return;
  
  checkingConflicts.value = true;
  
  try {
    // Create a temporary event object for conflict checking
    const tempEvent: Partial<ParishEvent> = {
      ...formData.value,
      parishId: props.parishId,
      // Don't include ID for new events
      ...(editMode.value && props.event ? { id: props.event.id } : {})
    };
    
    // Get existing events from parent or fetch if needed
    // For now, we'll use an empty array - this should be passed as a prop
    const existingEvents: ParishEvent[] = [];
    
    const detectedConflicts = conflictDetection.checkEventConflicts(
      tempEvent,
      existingEvents,
      props.priests,
      props.locations,
      {
        ignoreEventId: editMode.value ? props.event?.id : undefined,
        checkPriests: true,
        checkLocations: true,
        checkLiturgical: true
      }
    );
    
    conflicts.value = detectedConflicts;
  } catch (error) {
    console.error('Conflict checking failed:', error);
    conflicts.value = [];
  } finally {
    checkingConflicts.value = false;
  }
}

function getConflictIcon(type: string) {
  switch (type) {
    case 'time_overlap': return timeOutline;
    case 'priest_conflict': return peopleOutline;
    case 'liturgical_conflict': return calendarOutline;
    case 'resource_conflict': return warningOutline;
    default: return informationCircleOutline;
  }
}

function getConflictColor(severity: string) {
  switch (severity) {
    case 'error': return 'danger';
    case 'warning': return 'warning';
    case 'info': return 'primary';
    default: return 'medium';
  }
}
</script>

<style scoped>
.event-form {
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

.form-section:last-of-type {
  border-bottom: none;
}

.location-actions,
.priest-actions {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.date-range,
.time-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.specific-date-section {
  margin-top: 1rem;
}

.recurring-section {
  margin-top: 1rem;
}

.form-actions {
  padding: 1rem;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 0.5rem;
}

.liturgical-info {
  margin: 1rem 0;
}

.liturgical-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liturgical-details p {
  margin: 0.5rem 0;
}

.event-suggestions h4 {
  margin: 1rem 0 0.5rem 0;
  font-size: 1rem;
  color: var(--ion-color-primary);
}

.suggestion-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.suggestion-chips ion-chip {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.suggestion-chips ion-chip:hover {
  transform: translateY(-1px);
}

.conflict-detection {
  margin: 1rem 0;
}

.conflicts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.conflict-item {
  --background: var(--ion-color-light-tint);
  --border-radius: 8px;
  margin-bottom: 0.5rem;
}

.conflict-error {
  color: var(--ion-color-danger);
  font-weight: 600;
}

.conflict-warning {
  color: var(--ion-color-warning);
  font-weight: 500;
}

.conflict-info {
  color: var(--ion-color-primary);
}

.conflict-suggestions {
  margin-top: 0.5rem;
}

.conflict-suggestions ul {
  margin: 0.25rem 0 0 1rem;
  padding-left: 0;
}

.conflict-suggestions li {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin-bottom: 0.25rem;
}

.conflicting-events {
  margin-top: 0.5rem;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .date-range,
  .time-section {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .form-section {
    padding: 0.75rem;
  }
}
</style>