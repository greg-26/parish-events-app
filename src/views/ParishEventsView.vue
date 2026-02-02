<template>
  <ion-content>
    <div class="container">
      <!-- Header with Add Button -->
      <div class="section-header">
        <h2>Parish Events</h2>
        <ion-button v-if="canManage" @click="showCreateEvent = true" color="primary">
          <ion-icon slot="start" :icon="addOutline" />
          Add Event
        </ion-button>
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

      <!-- Events List -->
      <div v-else class="events-list">
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

    <!-- Create Event Modal (Placeholder) -->
    <ion-modal :is-open="showCreateEvent" @did-dismiss="showCreateEvent = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Create Event</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showCreateEvent = false" fill="clear">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="modal-content">
          <p>Event creation form coming soon...</p>
          <p>This will include:</p>
          <ul>
            <li>Event name and type (Mass, Adoration, etc.)</li>
            <li>Location selection from parish locations</li>
            <li>Date/time scheduling with recurrence patterns</li>
            <li>Priest assignment</li>
            <li>Description and special notes</li>
          </ul>
        </div>
      </ion-content>
    </ion-modal>
  </ion-content>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/lib/api';
import type { ParishEvent, EventType } from '@/shared/types';
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
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons
} from '@ionic/vue';
import {
  addOutline,
  calendarOutline,
  churchOutline,
  timeOutline,
  prismOutline,
  bookOutline,
  peopleOutline,
  helpOutline,
  closeOutline
} from 'ionicons/icons';

const route = useRoute();
const parishId = computed(() => route.params.id as string);

// Assume these are provided by parent or through context
const canManage = ref(true); // TODO: Get from parent component
const locations = ref<any[]>([]); // TODO: Fetch locations
const priests = ref<any[]>([]); // TODO: Fetch priests

const loading = ref(true);
const events = ref<ParishEvent[]>([]);
const showCreateEvent = ref(false);

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
  console.log('Edit event:', event);
  // TODO: Open edit modal
}

async function fetchEvents() {
  try {
    loading.value = true;
    // TODO: Implement API call
    events.value = [];
  } catch (error) {
    console.error('Failed to fetch events:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await fetchEvents();
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

.modal-content {
  padding: 1rem;
}

.modal-content ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}
</style>