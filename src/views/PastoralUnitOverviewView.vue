<template>
  <ion-content>
    <div class="container">
      <h2>Pastoral Unit Overview</h2>
      
      <div class="overview-grid">
        <!-- Summary Cards -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Parishes</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="stat-number">3</div>
            <p>parishes in this unit</p>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Shared Priests</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="stat-number">5</div>
            <p>priests serving all parishes</p>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Weekly Masses</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="stat-number">24</div>
            <p>masses per week across unit</p>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
          <ion-button expand="block" fill="outline">
            <ion-icon slot="start" :icon="calendarOutline" />
            View Shared Calendar
          </ion-button>
          <ion-button expand="block" fill="outline">
            <ion-icon slot="start" :icon="peopleOutline" />
            Manage Priests
          </ion-button>
          <ion-button expand="block" fill="outline">
            <ion-icon slot="start" :icon="businessOutline" />
            Coordinate Schedules
          </ion-button>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="section">
        <h3>Recent Activity</h3>
        <ion-list>
          <ion-item>
            <ion-icon slot="start" :icon="personAddOutline" />
            <ion-label>
              <h4>Fr. Martinez assigned to Sunday Mass</h4>
              <p>St. Mary's Parish • 2 hours ago</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-icon slot="start" :icon="calendarOutline" />
            <ion-label>
              <h4>Easter schedule updated</h4>
              <p>All parishes • 1 day ago</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/vue';
import {
  calendarOutline,
  peopleOutline,
  businessOutline,
  personAddOutline
} from 'ionicons/icons';
</script>

<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--ion-color-primary);
  margin-bottom: 0.5rem;
}

.section {
  margin: 2rem 0;
}

.section h3 {
  margin-bottom: 1rem;
}

.action-buttons {
  display: grid;
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .action-buttons {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>