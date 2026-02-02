<template>
  <div class="location-picker">
    <ion-card>
      <ion-card-header>
        <ion-card-title>
          <ion-icon :icon="mapOutline" />
          Select Location
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <!-- Search Bar -->
        <div class="search-section">
          <ion-item>
            <ion-input
              v-model="searchQuery"
              @ion-input="onSearchInput"
              label="Search for address or Catholic place"
              label-placement="stacked"
              placeholder="e.g., St. Mary's Church, 123 Main St"
              fill="outline"
            >
              <ion-icon slot="start" :icon="searchOutline" />
            </ion-input>
          </ion-item>
          
          <div class="search-options">
            <ion-chip 
              @click="searchCatholicPlaces"
              :color="catholicMode ? 'primary' : 'medium'"
              :fill="catholicMode ? 'solid' : 'outline'"
            >
              <ion-icon :icon="churchOutline" slot="start" />
              Catholic Places Only
            </ion-chip>
            
            <ion-chip
              @click="useCurrentLocation"
              color="secondary"
              outline
            >
              <ion-icon :icon="locateOutline" slot="start" />
              Use Current Location
            </ion-chip>
          </div>
        </div>

        <!-- Search Results -->
        <div v-if="searchResults.length > 0" class="search-results">
          <h4>Search Results</h4>
          <ion-list>
            <ion-item 
              v-for="result in searchResults" 
              :key="result.placeId"
              @click="selectSearchResult(result)"
              button
            >
              <ion-icon 
                slot="start" 
                :icon="getLocationIcon(result)" 
                :color="getLocationColor(result)"
              />
              <ion-label>
                <h3>{{ getLocationDisplayName(result) }}</h3>
                <p>{{ result.displayName }}</p>
                <ion-note color="medium">
                  Distance: {{ getDistance(result) }}
                </ion-note>
              </ion-label>
              <ion-badge 
                slot="end" 
                v-if="isCatholicPlace(result)"
                color="warning"
              >
                ⛪ Catholic
              </ion-badge>
            </ion-item>
          </ion-list>
        </div>

        <!-- Map Container -->
        <div class="map-container">
          <div ref="mapElement" class="map" />
          
          <!-- Map Controls -->
          <div class="map-controls">
            <ion-fab-button 
              size="small" 
              @click="centerOnUser"
              :disabled="!userLocation"
            >
              <ion-icon :icon="locateOutline" />
            </ion-fab-button>
            
            <ion-fab-button 
              size="small" 
              @click="zoomIn"
            >
              <ion-icon :icon="addOutline" />
            </ion-fab-button>
            
            <ion-fab-button 
              size="small" 
              @click="zoomOut"
            >
              <ion-icon :icon="removeOutline" />
            </ion-fab-button>
          </div>
        </div>

        <!-- Selected Location Info -->
        <div v-if="selectedLocation" class="selected-location">
          <h4>Selected Location</h4>
          <ion-card>
            <ion-card-content>
              <div class="location-details">
                <h5>{{ selectedLocation.name || 'Custom Location' }}</h5>
                <p v-if="selectedLocation.address">{{ selectedLocation.address }}</p>
                <div class="coordinates">
                  <ion-chip color="medium" outline>
                    <ion-icon :icon="locateOutline" slot="start" />
                    {{ selectedLocation.coordinates.latitude.toFixed(6) }}, 
                    {{ selectedLocation.coordinates.longitude.toFixed(6) }}
                  </ion-chip>
                  <ion-chip 
                    v-if="selectedLocation.osmId" 
                    color="success" 
                    outline
                  >
                    <ion-icon :icon="mapOutline" slot="start" />
                    OSM: {{ selectedLocation.osmId }}
                  </ion-chip>
                </div>
                
                <!-- OSM Link -->
                <div v-if="selectedLocation.osmId" class="osm-link">
                  <ion-button 
                    fill="clear" 
                    size="small" 
                    :href="getOSMUrl(selectedLocation.osmId)"
                    target="_blank"
                  >
                    <ion-icon slot="start" :icon="openOutline" />
                    View on OpenStreetMap
                  </ion-button>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading">
          <ion-spinner />
          <p>{{ loadingMessage }}</p>
        </div>
      </ion-card-content>
      
      <div class="picker-actions">
        <ion-button @click="$emit('cancel')" fill="clear" color="medium">
          Cancel
        </ion-button>
        <ion-button 
          @click="confirmSelection"
          :disabled="!selectedLocation"
          color="primary"
        >
          <ion-icon slot="start" :icon="checkmarkOutline" />
          Select This Location
        </ion-button>
      </div>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { geocodingService } from '@/services/geocoding';
import type { GeocodingResult, CatholicPlace } from '@/services/geocoding';
import type { GeoCoordinates, PostalAddress } from '@/shared/types';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonList,
  IonLabel,
  IonNote,
  IonBadge,
  IonButton,
  IonIcon,
  IonChip,
  IonSpinner,
  IonFabButton,
  loadingController
} from '@ionic/vue';
import {
  mapOutline,
  searchOutline,
  churchOutline,
  locateOutline,
  addOutline,
  removeOutline,
  openOutline,
  checkmarkOutline,
  homeOutline,
  businessOutline,
  libraryOutline
} from 'ionicons/icons';

// Leaflet imports (need to install: npm install leaflet @types/leaflet)
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SelectedLocation {
  name?: string;
  address?: string;
  coordinates: GeoCoordinates;
  osmId?: number;
  postalAddress?: PostalAddress;
}

interface Props {
  initialLocation?: GeoCoordinates;
  countryCode?: string;
}

interface Emits {
  (e: 'location-selected', location: SelectedLocation): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Refs
const mapElement = ref<HTMLElement>();
const searchQuery = ref('');
const searchResults = ref<GeocodingResult[]>([]);
const selectedLocation = ref<SelectedLocation | null>(null);
const loading = ref(false);
const loadingMessage = ref('');
const catholicMode = ref(false);
const userLocation = ref<GeoCoordinates | null>(null);

// Map instance
let map: L.Map | null = null;
let selectedMarker: L.Marker | null = null;
let searchMarkers: L.Marker[] = [];

// Default location (Madrid, Spain)
const defaultLocation: GeoCoordinates = { latitude: 40.4168, longitude: -3.7038 };

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null;

onMounted(async () => {
  await nextTick();
  initializeMap();
  getCurrentLocation();
});

onUnmounted(() => {
  if (map) {
    map.remove();
  }
});

async function initializeMap() {
  if (!mapElement.value) return;
  
  const initialCoords = props.initialLocation || defaultLocation;
  
  // Initialize Leaflet map
  map = L.map(mapElement.value, {
    center: [initialCoords.latitude, initialCoords.longitude],
    zoom: props.initialLocation ? 16 : 11,
    zoomControl: false, // We'll use custom controls
  });

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Add click handler
  map.on('click', onMapClick);

  // If initial location provided, add marker
  if (props.initialLocation) {
    addSelectedMarker(props.initialLocation);
  }
}

async function onMapClick(event: L.LeafletMouseEvent) {
  const { lat, lng } = event.latlng;
  
  // Update selected location
  addSelectedMarker({ latitude: lat, longitude: lng });
  
  // Try to reverse geocode
  loading.value = true;
  loadingMessage.value = 'Looking up address...';
  
  try {
    const result = await geocodingService.reverseGeocode(lat, lng);
    
    if (result) {
      selectedLocation.value = {
        address: result.displayName,
        coordinates: { latitude: lat, longitude: lng },
        osmId: result.osmId,
        postalAddress: {
          streetAddress: result.address.road && result.address.house_number ? 
            `${result.address.house_number} ${result.address.road}` : result.address.road,
          addressLocality: result.address.city,
          addressRegion: result.address.state,
          postalCode: result.address.postcode,
          addressCountry: result.address.country_code?.toUpperCase() || 'ES'
        }
      };
    } else {
      selectedLocation.value = {
        coordinates: { latitude: lat, longitude: lng }
      };
    }
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    selectedLocation.value = {
      coordinates: { latitude: lat, longitude: lng }
    };
  } finally {
    loading.value = false;
  }
}

function addSelectedMarker(coords: GeoCoordinates) {
  if (!map) return;
  
  // Remove existing selected marker
  if (selectedMarker) {
    map.removeLayer(selectedMarker);
  }
  
  // Create custom red marker for selection
  const redIcon = L.divIcon({
    className: 'custom-marker selected-marker',
    html: '<div class="marker-pin"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 20]
  });
  
  selectedMarker = L.marker([coords.latitude, coords.longitude], {
    icon: redIcon
  }).addTo(map);
  
  selectedLocation.value = {
    coordinates: coords,
    ...selectedLocation.value
  };
}

async function onSearchInput(event: any) {
  const query = event.target.value?.trim();
  
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  if (!query || query.length < 3) {
    searchResults.value = [];
    return;
  }
  
  searchTimeout = setTimeout(async () => {
    await performSearch(query);
  }, 500);
}

async function performSearch(query: string) {
  loading.value = true;
  loadingMessage.value = 'Searching locations...';
  
  try {
    if (catholicMode.value) {
      const catholicPlaces = await geocodingService.searchCatholicPlaces(query, {
        countryCode: props.countryCode,
        limit: 8,
        centerLat: userLocation.value?.latitude,
        centerLon: userLocation.value?.longitude,
        radius: 50 // 50km radius
      });
      
      // Convert Catholic places to geocoding results for uniform handling
      searchResults.value = catholicPlaces.map(place => ({
        displayName: `${place.name} - ${place.address}`,
        address: {
          road: place.name,
          city: extractCityFromAddress(place.address),
          country: extractCountryFromAddress(place.address)
        },
        lat: String(place.coordinates.lat),
        lon: String(place.coordinates.lon),
        placeId: place.osmId,
        osmType: 'node' as const,
        osmId: place.osmId,
        importance: 0.8,
        type: place.type,
        class: 'amenity'
      }));
    } else {
      searchResults.value = await geocodingService.search(query, {
        countryCode: props.countryCode,
        limit: 8
      });
    }
    
    // Clear existing search markers
    clearSearchMarkers();
    
    // Add markers for search results
    if (map) {
      searchResults.value.forEach((result, index) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        const markerIcon = L.divIcon({
          className: `custom-marker search-marker ${isCatholicPlace(result) ? 'catholic' : ''}`,
          html: `<div class="marker-pin"><span>${index + 1}</span></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24]
        });
        
        const marker = L.marker([lat, lon], { icon: markerIcon });
        marker.addTo(map);
        searchMarkers.push(marker);
      });
      
      // Fit map to show all search results
      if (searchResults.value.length > 0) {
        const group = new L.FeatureGroup(searchMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
      }
    }
  } catch (error) {
    console.error('Search failed:', error);
  } finally {
    loading.value = false;
  }
}

function clearSearchMarkers() {
  if (map) {
    searchMarkers.forEach(marker => map!.removeLayer(marker));
    searchMarkers = [];
  }
}

function selectSearchResult(result: GeocodingResult) {
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);
  
  // Move map to location
  if (map) {
    map.setView([lat, lon], 16);
  }
  
  // Add selected marker
  addSelectedMarker({ latitude: lat, longitude: lon });
  
  // Set location details
  selectedLocation.value = {
    name: getLocationDisplayName(result),
    address: result.displayName,
    coordinates: { latitude: lat, longitude: lon },
    osmId: result.osmId,
    postalAddress: {
      streetAddress: result.address.road && result.address.house_number ? 
        `${result.address.house_number} ${result.address.road}` : result.address.road,
      addressLocality: result.address.city,
      addressRegion: result.address.state,
      postalCode: result.address.postcode,
      addressCountry: result.address.country_code?.toUpperCase() || props.countryCode?.toUpperCase() || 'ES'
    }
  };
  
  // Clear search results
  searchResults.value = [];
  searchQuery.value = '';
}

function searchCatholicPlaces() {
  catholicMode.value = !catholicMode.value;
  if (searchQuery.value) {
    performSearch(searchQuery.value);
  }
}

async function useCurrentLocation() {
  if (userLocation.value) {
    if (map) {
      map.setView([userLocation.value.latitude, userLocation.value.longitude], 16);
    }
    return;
  }
  
  loading.value = true;
  loadingMessage.value = 'Getting your location...';
  
  try {
    const position = await getCurrentPosition();
    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
    
    userLocation.value = coords;
    
    if (map) {
      map.setView([coords.latitude, coords.longitude], 16);
    }
    
    // Optionally add marker at current location
    addSelectedMarker(coords);
    
  } catch (error) {
    console.error('Geolocation failed:', error);
  } finally {
    loading.value = false;
  }
}

function getCurrentLocation() {
  navigator.geolocation?.getCurrentPosition(
    (position) => {
      userLocation.value = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    },
    (error) => console.warn('Geolocation not available:', error),
    { timeout: 10000 }
  );
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  });
}

function centerOnUser() {
  if (userLocation.value && map) {
    map.setView([userLocation.value.latitude, userLocation.value.longitude], 16);
  }
}

function zoomIn() {
  if (map) {
    map.zoomIn();
  }
}

function zoomOut() {
  if (map) {
    map.zoomOut();
  }
}

function confirmSelection() {
  if (selectedLocation.value) {
    emit('location-selected', selectedLocation.value);
  }
}

function getLocationDisplayName(result: GeocodingResult): string {
  const parts = result.displayName.split(',');
  return parts[0].trim();
}

function getLocationIcon(result: GeocodingResult) {
  if (isCatholicPlace(result)) return churchOutline;
  if (result.class === 'building') return businessOutline;
  if (result.class === 'amenity') return libraryOutline;
  return homeOutline;
}

function getLocationColor(result: GeocodingResult): string {
  if (isCatholicPlace(result)) return 'warning';
  return 'medium';
}

function isCatholicPlace(result: GeocodingResult): boolean {
  const name = result.displayName.toLowerCase();
  const type = result.type.toLowerCase();
  const className = result.class.toLowerCase();
  
  const catholicTerms = ['catholic', 'church', 'cathedral', 'chapel', 'parish', 'basilica'];
  return catholicTerms.some(term => 
    name.includes(term) || type.includes(term)
  ) && className === 'amenity';
}

function getDistance(result: GeocodingResult): string {
  if (!userLocation.value) return '';
  
  const lat1 = userLocation.value.latitude;
  const lon1 = userLocation.value.longitude;
  const lat2 = parseFloat(result.lat);
  const lon2 = parseFloat(result.lon);
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

function getOSMUrl(osmId: number): string {
  return `https://www.openstreetmap.org/node/${osmId}`;
}

function extractCityFromAddress(address: string): string {
  const parts = address.split(',');
  return parts[1]?.trim() || '';
}

function extractCountryFromAddress(address: string): string {
  const parts = address.split(',');
  return parts[parts.length - 1]?.trim() || '';
}
</script>

<style scoped>
.location-picker {
  max-width: 800px;
  margin: 0 auto;
}

.search-section {
  margin-bottom: 1rem;
}

.search-options {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.search-results {
  margin: 1rem 0;
  max-height: 300px;
  overflow-y: auto;
}

.search-results h4 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-primary);
}

.map-container {
  position: relative;
  height: 400px;
  margin: 1rem 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--ion-color-light);
}

.map {
  height: 100%;
  width: 100%;
}

.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 1000;
}

.selected-location {
  margin-top: 1rem;
}

.selected-location h4 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-primary);
}

.location-details h5 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
}

.coordinates {
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem 0;
  flex-wrap: wrap;
}

.osm-link {
  margin-top: 0.5rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
}

.picker-actions {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid var(--ion-color-light);
}

/* Custom marker styles */
:global(.custom-marker) {
  background: none;
  border: none;
}

:global(.marker-pin) {
  width: 20px;
  height: 20px;
  border-radius: 50% 50% 50% 0;
  background: var(--ion-color-danger);
  border: 2px solid white;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

:global(.marker-pin span) {
  transform: rotate(45deg);
  font-size: 10px;
  font-weight: bold;
  color: white;
}

:global(.search-marker .marker-pin) {
  background: var(--ion-color-primary);
  width: 24px;
  height: 24px;
}

:global(.search-marker.catholic .marker-pin) {
  background: var(--ion-color-warning);
}

:global(.selected-marker .marker-pin) {
  background: var(--ion-color-success);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--ion-color-success-rgb), 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(var(--ion-color-success-rgb), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--ion-color-success-rgb), 0);
  }
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .map-container {
    height: 300px;
  }
  
  .picker-actions {
    flex-direction: column;
  }
  
  .search-options {
    justify-content: center;
  }
  
  .coordinates {
    justify-content: center;
  }
}
</style>