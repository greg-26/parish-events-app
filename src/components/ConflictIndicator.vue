<template>
  <div class="conflict-indicator">
    <ion-chip 
      v-for="conflict in visibleConflicts" 
      :key="conflict.type"
      :color="getConflictColor(conflict.severity)"
      size="small"
      outline
    >
      <ion-icon 
        slot="start" 
        :icon="getConflictIcon(conflict.type)"
        size="small"
      />
      {{ getConflictLabel(conflict.type) }}
    </ion-chip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ScheduleConflict } from '@/services/conflictDetection';
import { IonChip, IonIcon } from '@ionic/vue';
import {
  timeOutline,
  peopleOutline,
  calendarOutline,
  warningOutline,
  informationCircleOutline
} from 'ionicons/icons';

interface Props {
  conflicts: ScheduleConflict[];
  maxVisible?: number;
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 3
});

const visibleConflicts = computed(() => {
  return props.conflicts
    .filter(c => c.severity !== 'info')
    .slice(0, props.maxVisible);
});

function getConflictIcon(type: string) {
  switch (type) {
    case 'time_overlap': return timeOutline;
    case 'priest_conflict': return peopleOutline;
    case 'liturgical_conflict': return calendarOutline;
    case 'resource_conflict': return warningOutline;
    default: return informationCircleOutline;
  }
}

function getConflictColor(severity: string): string {
  switch (severity) {
    case 'error': return 'danger';
    case 'warning': return 'warning';
    case 'info': return 'primary';
    default: return 'medium';
  }
}

function getConflictLabel(type: string): string {
  switch (type) {
    case 'time_overlap': return 'Time';
    case 'priest_conflict': return 'Priest';
    case 'liturgical_conflict': return 'Liturgical';
    case 'resource_conflict': return 'Resource';
    default: return 'Issue';
  }
}
</script>

<style scoped>
.conflict-indicator {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}
</style>