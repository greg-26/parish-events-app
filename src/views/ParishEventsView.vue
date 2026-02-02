<template>
  <ion-content>
    <div class="container">
      <!-- Header with Add Button and View Toggle -->
      <div class="section-header">
        <h2>Parish Events</h2>
        <div class="header-actions">
          <ion-segment v-model="viewMode" value="list">
            <ion-segment-button value="list">
              <ion-icon :icon="listOutline" />
              <ion-label>List</ion-label>
            </ion-segment-button>
            <ion-segment-button value="calendar">
              <ion-icon :icon="calendarOutline" />
              <ion-label>Calendar</ion-label>
            </ion-segment-button>
          </ion-segment>
          
          <ion-button v-if="canManage" @click="showCreateEvent = true" color="primary">
            <ion-icon slot="start" :icon="addOutline" />
            Add Event
          </ion-button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">
        <ion-spinner />
        <p>Loading events...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="events.length === 0" class="empty-state">
        <ion-icon :icon="calendarOutline" size="large" />
        <h3>No Events Yet</h3>
        <p v-if="canManage">Get started by creating your first parish event or Mass schedule.</p>
        <p v-else>No events have been scheduled for this parish yet.</p>
        <ion-button v-if="canManage" @click="showCreateEvent = true" color="primary">
          <ion-icon slot="start" :icon="addOutline" />
          Add First Event
        </ion-button>
      </div>

      <!-- Calendar View -->
      <div v-if="viewMode === 'calendar'" class="calendar-view">
        <CalendarView
          :events="events"
          :locations="locations"
          :priests="priests"
          :parish-id="parishId"
          :can-manage="canManage"
          @create-event="onCalendarCreateEvent"
          @edit-event="editEvent"
          @create-from-suggestion="onCreateFromSuggestion"
        />
      </div>

      <!-- Events List -->
      <div v-else-if="viewMode === 'list' && events.length > 0" class="events-list">
        <ion-list>
          <ion-item 
            v-for="event in events" 
            :key="event.id"
            @click="editEvent(event)"
            :button="canManage"
          >
            <div slot="start" class="event-type-indicator" :class="event.eventType">
              <ion-icon :icon="getEventIcon(event.eventType)" />
            </div>
            
            <ion-label>
              <h3>{{ event.name }}</h3>
              <p v-if="event.description">{{ event.description }}</p>
              <ion-note color="medium">
                {{ formatSchedule(event) }} • {{ getLocationName(event.locationId) }}
              </ion-note>
              <div v-if="event.celebrantId || event.assistantIds?.length" class="priests">
                <ion-chip 
                  v-if="event.celebrantId" 
                  color="primary" 
                  outline
                  size="small"
                >
                  {{ getPriestName(event.celebrantId) }} (Celebrant)
                </ion-chip>
                <ion-chip 
                  v-for="assistantId in event.assistantIds" 
                  :key="assistantId"
                  color="secondary" 
                  outline
                  size="small"
                >
                  {{ getPriestName(assistantId) }}
                </ion-chip>
              </div>
            </ion-label>
            
            <div slot="end" class="event-actions">
              <ion-chip :color="getEventTypeColor(event.eventType)" outline>
                {{ event.eventType }}
              </ion-chip>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </div>

    <!-- Event Form Modal -->
    <EventFormView
      :is-open="showCreateEvent || showEditEvent"
      :parish-id="parishId"
      :event="editingEvent"
      :locations="locations"
      :priests="priests"
      :pending-suggestion="pendingSuggestion"
      @close="closeEventModal"
      @saved="onEventSaved"
    />
  </ion-content>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/lib/api';
import type { ParishEvent, EventType } from '@/shared/types';
import type { EventSuggestion } from '@/services/liturgicalCalendar';
import EventFormView from '@/views/EventFormView.vue';
import CalendarView from '@/components/CalendarView.vue';
import {
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonButton,
  IonIcon,
  IonSpinner,
  IonChip,
  IonSegment,
  IonSegmentButton,
  alertController
} from '@ionic/vue';
import {
  addOutline,
  calendarOutline,
  listOutline,
  churchOutline,
  timeOutline,
  prismOutline,
  bookOutline,
  peopleOutline,
  helpOutline
} from 'ionicons/icons';

const route = useRoute();
const parishId = computed(() => route.params.id as string);

const canManage = ref(true); // TODO: Get from parent component
const loading = ref(true);
const events = ref<ParishEvent[]>([]);
const locations = ref<any[]>([]);
const priests = ref<any[]>([]);
const viewMode = ref('list');

// Modal states
const showCreateEvent = ref(false);
const showEditEvent = ref(false);
const editingEvent = ref<ParishEvent | null>(null);
const pendingSuggestion = ref<{suggestion: EventSuggestion, date: string} | null>(null);

function getEventIcon(eventType: EventType) {
  const icons = {
    mass: churchOutline,
    adoration: prismOutline,
    confession: bookOutline,
    vespers: timeOutline,
    rosary: prismOutline,
    meeting: peopleOutline,
    celebration: calendarOutline,
    other: helpOutline
  };
  return icons[eventType] || helpOutline;
}

function getEventTypeColor(eventType: EventType) {
  const colors = {
    mass: 'primary',
    adoration: 'secondary',
    confession: 'tertiary',
    vespers: 'success',
    rosary: 'warning',
    meeting: 'medium',
    celebration: 'danger',
    other: 'dark'
  };
  return colors[eventType] || 'medium';
}

function formatSchedule(event: ParishEvent): string {
  if (event.specificDate) {
    const date = new Date(event.specificDate);
    return date.toLocaleDateString() + (event.schedule?.startTime ? ` at ${event.schedule.startTime}` : '');
  }
  
  if (event.schedule) {
    const days = event.schedule.byDay.join(', ');
    return `${days} at ${event.schedule.startTime}`;
  }
  
  return 'Schedule TBD';
}

function getLocationName(locationId: string): string {
  const location = locations.value.find(l => l.id === locationId);
  return location?.name || 'Unknown Location';
}

function getPriestName(priestId: string): string {
  const priest = priests.value.find(p => p.id === priestId);
  return priest?.name || 'Unknown Priest';
}

function editEvent(event: ParishEvent) {
  if (!canManage.value) return;
  editingEvent.value = event;
  showEditEvent.value = true;
}

function closeEventModal() {
  showCreateEvent.value = false;
  showEditEvent.value = false;
  editingEvent.value = null;
  pendingSuggestion.value = null;
}

function onEventSaved(event: ParishEvent) {
  if (editingEvent.value) {
    // Update existing event
    const index = events.value.findIndex(e => e.id === event.id);
    if (index >= 0) {
      events.value[index] = event;
    }
  } else {
    // Add new event
    events.value.push(event);
  }
}

function onCalendarCreateEvent(date: string) {
  // Set specific date and open create modal
  showCreateEvent.value = true;
  // The EventFormView will pick up the date automatically
}

function onCreateFromSuggestion(suggestion: EventSuggestion, date: string) {
  // Store suggestion to pre-fill form
  pendingSuggestion.value = { suggestion, date };
  showCreateEvent.value = true;
}

async function fetchEvents() {
  try {
    loading.value = true;
    const response = await api.get(`/parish/${parishId.value}/events`);
    events.value = response;
  } catch (error) {
    console.error('Failed to fetch events:', error);
    const alert = await alertController.create({
      header: 'Error',
      message: 'Failed to load events. Please try again.',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    loading.value = false;
  }
}

async function fetchLocations() {
  try {
    const response = await api.get(`/parish/${parishId.value}/locations`);
    locations.value = response;
  } catch (error) {
    console.error('Failed to fetch locations:', error);
  }
}

async function fetchPriests() {
  try {
    const response = await api.get(`/parish/${parishId.value}/priests`);
    priests.value = response;
  } catch (error) {
    console.error('Failed to fetch priests:', error);
  }
}

onMounted(async () => {
  await Promise.all([
    fetchEvents(),
    fetchLocations(),
    fetchPriests()
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
  gap: 1rem;
}

.section-header h2 {
  margin: 0;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.calendar-view {
  margin-bottom: 2rem;
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

.event-type-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
}

.event-type-indicator.mass { background: var(--ion-color-primary-tint); }
.event-type-indicator.adoration { background: var(--ion-color-secondary-tint); }
.event-type-indicator.confession { background: var(--ion-color-tertiary-tint); }
.event-type-indicator.other { background: var(--ion-color-medium-tint); }

.priests {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.event-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
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
  
  .priests {
    gap: 0.125rem;
  }
  
  .priests ion-chip {
    font-size: 0.75rem;
    --border-radius: 12px;
  }
  
  .event-type-indicator {
    width: 32px;
    height: 32px;
    margin-right: 0.75rem;
  }
  
  .event-actions {
    margin-left: 0.5rem;
  }
}

@media (max-width: 480px) {
  ion-item {
    --padding-start: 12px;
    --padding-end: 12px;
  }
  
  .event-type-indicator {
    display: none;
  }
  
  .priests {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>