<template>
  <div class="calendar-view">
    <!-- Calendar Header -->
    <div class="calendar-header">
      <ion-button fill="clear" @click="previousMonth">
        <ion-icon :icon="chevronBackOutline" />
      </ion-button>
      
      <div class="month-year">
        <h2>{{ currentMonthName }} {{ currentYear }}</h2>
        <ion-button fill="clear" @click="showMonthPicker = true">
          <ion-icon :icon="calendarOutline" />
        </ion-button>
      </div>
      
      <ion-button fill="clear" @click="nextMonth">
        <ion-icon :icon="chevronForwardOutline" />
      </ion-button>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-grid">
      <!-- Day Headers -->
      <div class="day-header" v-for="day in dayHeaders" :key="day">
        {{ day }}
      </div>
      
      <!-- Calendar Days -->
      <div 
        v-for="day in calendarDays" 
        :key="`${day.date}-${day.month}`"
        class="calendar-day"
        :class="{
          'other-month': day.isOtherMonth,
          'today': day.isToday,
          'has-events': day.events.length > 0,
          'liturgical-day': day.liturgical?.isHolyDay
        }"
        @click="selectDay(day)"
      >
        <!-- Day Number -->
        <div class="day-number">
          {{ day.dayOfMonth }}
        </div>
        
        <!-- Liturgical Season Indicator -->
        <div 
          v-if="day.liturgical" 
          class="liturgical-indicator"
          :class="`liturgical-${day.liturgical.color}`"
        />
        
        <!-- Events -->
        <div class="day-events">
          <div 
            v-for="event in day.events.slice(0, 3)" 
            :key="event.id"
            class="event-indicator"
            :class="`event-${event.eventType}`"
            @click.stop="selectEvent(event)"
          >
            <span class="event-time" v-if="event.schedule?.startTime">
              {{ formatTime(event.schedule.startTime) }}
            </span>
            <span class="event-name">{{ event.name }}</span>
          </div>
          
          <!-- More events indicator -->
          <div v-if="day.events.length > 3" class="more-events">
            +{{ day.events.length - 3 }} more
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Day Details Modal -->
    <ion-modal :is-open="selectedDay !== null" @did-dismiss="selectedDay = null">
      <ion-header>
        <ion-toolbar>
          <ion-title v-if="selectedDay">
            {{ formatSelectedDate(selectedDay.date) }}
          </ion-title>
          <ion-buttons slot="end">
            <ion-button @click="selectedDay = null" fill="clear">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content v-if="selectedDay">
        <!-- Liturgical Information -->
        <div v-if="selectedDay.liturgical" class="selected-day-liturgical">
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon :icon="sparklesOutline" />
                Liturgical Calendar
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="liturgical-details">
                <ion-chip :color="getLiturgicalColorCode(selectedDay.liturgical.color)">
                  {{ selectedDay.liturgical.season }}
                </ion-chip>
                <ion-chip color="medium" outline>
                  {{ selectedDay.liturgical.rank }}
                </ion-chip>
                <p><strong>{{ selectedDay.liturgical.name }}</strong></p>
                
                <!-- Liturgical Suggestions -->
                <div v-if="selectedDay.liturgical.suggestedEvents?.length" class="liturgical-suggestions">
                  <h4>✨ Suggested Events</h4>
                  <div class="suggestion-list">
                    <ion-item 
                      v-for="suggestion in selectedDay.liturgical.suggestedEvents"
                      :key="suggestion.name"
                      button
                      @click="createEventFromSuggestion(suggestion, selectedDay.date)"
                    >
                      <ion-icon 
                        slot="start" 
                        :icon="getEventIcon(suggestion.type)" 
                        :color="getSuggestionColor(suggestion.priority)"
                      />
                      <ion-label>
                        <h3>{{ suggestion.name }}</h3>
                        <p>{{ suggestion.description }}</p>
                        <ion-note v-if="suggestion.recommendedTime">
                          Recommended time: {{ suggestion.recommendedTime }}
                        </ion-note>
                      </ion-label>
                    </ion-item>
                  </div>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Events for Selected Day -->
        <div class="selected-day-events">
          <div class="section-header">
            <h3>Events</h3>
            <ion-button v-if="canManage" @click="createEvent(selectedDay.date)" size="small">
              <ion-icon slot="start" :icon="addOutline" />
              Add Event
            </ion-button>
          </div>
          
          <div v-if="selectedDay.events.length === 0" class="no-events">
            <p>No events scheduled for this day</p>
          </div>
          
          <ion-list v-else>
            <ion-item 
              v-for="event in selectedDay.events" 
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
                  {{ formatEventTime(event) }} • {{ getLocationName(event.locationId) }}
                </ion-note>
                <div v-if="event.celebrantId" class="priest-info">
                  <ion-chip color="primary" outline size="small">
                    {{ getPriestName(event.celebrantId) }} (Celebrant)
                  </ion-chip>
                </div>
              </ion-label>
              
              <ion-chip slot="end" :color="getEventTypeColor(event.eventType)" outline>
                {{ event.eventType }}
              </ion-chip>
            </ion-item>
          </ion-list>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Month Picker Modal -->
    <ion-modal :is-open="showMonthPicker" @did-dismiss="showMonthPicker = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Select Month</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showMonthPicker = false" fill="clear">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="month-picker">
          <div class="year-selector">
            <ion-button fill="clear" @click="pickerYear--">
              <ion-icon :icon="chevronBackOutline" />
            </ion-button>
            <h2>{{ pickerYear }}</h2>
            <ion-button fill="clear" @click="pickerYear++">
              <ion-icon :icon="chevronForwardOutline" />
            </ion-button>
          </div>
          
          <div class="months-grid">
            <ion-button
              v-for="(month, index) in monthNames"
              :key="month"
              @click="jumpToMonth(index, pickerYear)"
              :color="index === currentMonth && pickerYear === currentYear ? 'primary' : 'medium'"
              :fill="index === currentMonth && pickerYear === currentYear ? 'solid' : 'outline'"
            >
              {{ month }}
            </ion-button>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { liturgicalCalendar } from '@/services/liturgicalCalendar';
import type { ParishEvent } from '@/shared/types';
import type { LiturgicalDay, EventSuggestion } from '@/services/liturgicalCalendar';
import {
  IonButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonItem,
  IonLabel,
  IonNote,
  IonList
} from '@ionic/vue';
import {
  chevronBackOutline,
  chevronForwardOutline,
  calendarOutline,
  closeOutline,
  sparklesOutline,
  addOutline,
  churchOutline,
  timeOutline,
  prismOutline,
  bookOutline,
  peopleOutline,
  helpOutline
} from 'ionicons/icons';

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  month: number;
  isOtherMonth: boolean;
  isToday: boolean;
  events: ParishEvent[];
  liturgical?: LiturgicalDay;
}

interface Props {
  events: ParishEvent[];
  locations: any[];
  priests: any[];
  parishId: string;
  canManage?: boolean;
}

interface Emits {
  (e: 'create-event', date: string): void;
  (e: 'edit-event', event: ParishEvent): void;
  (e: 'create-from-suggestion', suggestion: EventSuggestion, date: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const currentDate = ref(new Date());
const selectedDay = ref<CalendarDay | null>(null);
const showMonthPicker = ref(false);
const pickerYear = ref(new Date().getFullYear());

const currentMonth = computed(() => currentDate.value.getMonth());
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonthName = computed(() => monthNames[currentMonth.value]);

const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const calendarDays = computed(() => {
  const days: CalendarDay[] = [];
  const firstDay = new Date(currentYear.value, currentMonth.value, 1);
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0);
  const today = new Date();
  
  // Add previous month days
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  // Add next month days to complete the grid
  const endDate = new Date(lastDay);
  const remainingDays = 6 - lastDay.getDay();
  endDate.setDate(endDate.getDate() + remainingDays);
  
  // Generate all days for the calendar view
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dayEvents = getEventsForDate(date);
    const liturgicalDay = liturgicalCalendar.getLiturgicalDay(new Date(date));
    
    days.push({
      date: new Date(date),
      dayOfMonth: date.getDate(),
      month: date.getMonth(),
      isOtherMonth: date.getMonth() !== currentMonth.value,
      isToday: date.toDateString() === today.toDateString(),
      events: dayEvents,
      liturgical: liturgicalDay
    });
  }
  
  return days;
});

function getEventsForDate(date: Date): ParishEvent[] {
  const dateStr = date.toISOString().split('T')[0];
  return props.events.filter(event => {
    if (event.specificDate === dateStr) return true;
    
    if (event.isRecurring && event.schedule) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (event.schedule.byDay.includes(dayName as any)) {
        // Check if date is within the recurrence range
        if (event.schedule.startDate && dateStr < event.schedule.startDate) return false;
        if (event.schedule.endDate && dateStr > event.schedule.endDate) return false;
        if (event.schedule.exceptDates?.includes(dateStr)) return false;
        return true;
      }
    }
    
    return false;
  });
}

function previousMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1);
}

function nextMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1);
}

function jumpToMonth(month: number, year: number) {
  currentDate.value = new Date(year, month, 1);
  pickerYear.value = year;
  showMonthPicker.value = false;
}

function selectDay(day: CalendarDay) {
  selectedDay.value = day;
}

function selectEvent(event: ParishEvent) {
  emit('edit-event', event);
}

function createEvent(date: Date) {
  emit('create-event', date.toISOString().split('T')[0]);
}

function editEvent(event: ParishEvent) {
  emit('edit-event', event);
  selectedDay.value = null;
}

function createEventFromSuggestion(suggestion: EventSuggestion, date: Date) {
  emit('create-from-suggestion', suggestion, date.toISOString().split('T')[0]);
  selectedDay.value = null;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour24 = parseInt(hours);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
}

function formatSelectedDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatEventTime(event: ParishEvent): string {
  if (event.schedule?.startTime) {
    let timeStr = formatTime(event.schedule.startTime);
    if (event.schedule.endTime) {
      timeStr += ` - ${formatTime(event.schedule.endTime)}`;
    }
    return timeStr;
  }
  return 'All day';
}

function getLocationName(locationId: string): string {
  const location = props.locations.find(l => l.id === locationId);
  return location?.name || 'Unknown Location';
}

function getPriestName(priestId: string): string {
  const priest = props.priests.find(p => p.id === priestId);
  return priest?.preferredName || priest?.name || 'Unknown Priest';
}

function getEventIcon(eventType: string) {
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
  return icons[eventType as keyof typeof icons] || helpOutline;
}

function getEventTypeColor(eventType: string): string {
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
  return colors[eventType as keyof typeof colors] || 'medium';
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

watch(() => props.parishId, () => {
  // Reset calendar when parish changes
  currentDate.value = new Date();
  selectedDay.value = null;
});

onMounted(() => {
  pickerYear.value = currentYear.value;
});
</script>

<style scoped>
.calendar-view {
  max-width: 1000px;
  margin: 0 auto;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--ion-color-light);
}

.month-year {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.month-year h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--ion-color-primary);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--ion-color-light);
}

.day-header {
  background: var(--ion-color-light-tint);
  text-align: center;
  font-weight: 600;
  padding: 0.75rem 0.25rem;
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

.calendar-day {
  background: var(--ion-color-light-contrast);
  min-height: 120px;
  padding: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
  border: 1px solid transparent;
}

.calendar-day:hover {
  background: var(--ion-color-light-tint);
}

.calendar-day.other-month {
  background: var(--ion-color-step-50);
  color: var(--ion-color-medium);
}

.calendar-day.today {
  border-color: var(--ion-color-primary);
  background: var(--ion-color-primary-tint);
}

.calendar-day.has-events {
  border-left: 4px solid var(--ion-color-secondary);
}

.calendar-day.liturgical-day {
  border-top: 3px solid var(--ion-color-warning);
}

.day-number {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.liturgical-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.liturgical-white { background: #ffffff; border: 1px solid #ccc; }
.liturgical-red { background: var(--ion-color-danger); }
.liturgical-green { background: var(--ion-color-success); }
.liturgical-purple { background: var(--ion-color-secondary); }
.liturgical-rose { background: var(--ion-color-warning); }
.liturgical-black { background: var(--ion-color-dark); }

.day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-indicator {
  background: var(--ion-color-primary-tint);
  border-left: 3px solid var(--ion-color-primary);
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 0.75rem;
  line-height: 1.2;
  cursor: pointer;
  transition: background-color 0.2s;
}

.event-indicator:hover {
  background: var(--ion-color-primary-shade);
  color: white;
}

.event-indicator.event-mass { border-color: var(--ion-color-primary); }
.event-indicator.event-adoration { border-color: var(--ion-color-secondary); }
.event-indicator.event-confession { border-color: var(--ion-color-tertiary); }
.event-indicator.event-celebration { border-color: var(--ion-color-danger); }

.event-time {
  font-weight: 600;
}

.event-name {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.more-events {
  font-size: 0.7rem;
  color: var(--ion-color-medium);
  font-style: italic;
  text-align: center;
  padding: 2px;
}

.selected-day-liturgical {
  padding: 1rem;
}

.liturgical-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liturgical-suggestions h4 {
  margin: 1rem 0 0.5rem 0;
  font-size: 1rem;
  color: var(--ion-color-primary);
}

.selected-day-events {
  padding: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0;
  color: var(--ion-color-primary);
}

.no-events {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 2rem;
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

.priest-info {
  margin-top: 0.5rem;
}

.month-picker {
  padding: 1rem;
}

.year-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.year-selector h2 {
  margin: 0;
  font-size: 2rem;
  color: var(--ion-color-primary);
}

.months-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .calendar-day {
    min-height: 80px;
    padding: 0.25rem;
  }
  
  .day-number {
    font-size: 1rem;
  }
  
  .event-indicator {
    font-size: 0.7rem;
    padding: 1px 2px;
  }
  
  .event-time {
    display: none;
  }
  
  .calendar-header {
    padding: 0.5rem;
  }
  
  .month-year h2 {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .calendar-day {
    min-height: 60px;
    padding: 0.125rem;
  }
  
  .day-header {
    padding: 0.5rem 0.125rem;
    font-size: 0.8rem;
  }
  
  .event-indicator {
    font-size: 0.65rem;
  }
  
  .event-name {
    max-width: 50px;
  }
}
</style>