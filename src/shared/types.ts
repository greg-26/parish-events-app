/**
 * Shared Type Definitions for Parish Events App
 * 
 * Contains all TypeScript interfaces and types used across the application,
 * including data models for parishes, events, locations, and priests.
 */

// ===== CORE TYPES =====

export type EventType = 
  | 'mass'
  | 'adoration'
  | 'confession'
  | 'vespers'
  | 'rosary'
  | 'stations'
  | 'novena'
  | 'retreat'
  | 'catechesis'
  | 'youth'
  | 'meeting'
  | 'celebration'
  | 'wedding'
  | 'funeral'
  | 'baptism'
  | 'confirmation'
  | 'other';

export type WeekDay = 
  | 'Sunday'
  | 'Monday' 
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export type UserRole = 'admin' | 'manager' | 'viewer';

// ===== ADDRESS TYPES =====

export interface PostalAddress {
  streetAddress?: string;
  addressLocality?: string; // City
  addressRegion?: string;   // State/Province
  postalCode?: string;
  addressCountry: string;   // ISO country code
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

// ===== PARISH TYPES =====

export interface Parish {
  id: string;
  name: string;
  description?: string;
  address: PostalAddress;
  website?: string;
  phone?: string;
  email?: string;
  coordinates?: GeoCoordinates;
  osmNode?: string; // OpenStreetMap node ID
  diocese?: string;
  pastoralUnitId?: string;
  
  // Admin fields
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ParishUser {
  userId: string;
  parishId: string;
  role: UserRole;
  assignedAt: string;
  assignedBy: string;
}

// ===== LOCATION TYPES =====

export interface ParishLocation {
  id: string;
  parishId: string;
  name: string;
  isDefault?: boolean;
  address: PostalAddress;
  coordinates?: GeoCoordinates;
  osmNode?: string; // OpenStreetMap node ID
  capacity?: number;
  accessibility?: string;
  
  // Admin fields
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ===== PRIEST TYPES =====

export interface Priest {
  id: string;
  parishId: string;
  title: string; // Father, Monsignor, Bishop, etc.
  name: string;
  preferredName?: string; // e.g., "Father John"
  email?: string;
  phone?: string;
  isParishPriest?: boolean; // Is this the main pastor?
  isActive: boolean;
  
  // Ministry details
  ordainedDate?: string;
  diocese?: string;
  languages?: string[];
  specialties?: string;
  
  // Admin fields
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ===== EVENT TYPES =====

export interface EventSchedule {
  // Time
  startTime: string; // HH:mm format
  endTime?: string;
  
  // Recurrence (for recurring events)
  byDay: WeekDay[]; // Days of the week
  repeatFrequency?: string; // ISO 8601 duration (P1W, P1M, P1Y)
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD (optional, indefinite if not set)
  exceptDates?: string[]; // YYYY-MM-DD dates to skip
}

export interface ParishEvent {
  id: string;
  parishId: string;
  
  // Basic information
  name: string;
  eventType: EventType;
  description?: string;
  image?: string; // URL to event image
  
  // Location
  locationId: string;
  
  // Priests
  celebrantId?: string;   // Main celebrant
  assistantIds?: string[]; // Assistant priests
  
  // Schedule
  isRecurring: boolean;
  specificDate?: string;  // YYYY-MM-DD for one-time events
  schedule?: EventSchedule; // For recurring events
  
  // JSON-LD / Mass Times Protocol compliance
  additionalType?: string; // Wikidata URL for specific event type
  
  // Admin fields
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ===== PASTORAL UNIT TYPES =====

export interface PastoralUnit {
  id: string;
  name: string;
  description?: string;
  parishes: string[]; // Array of parish IDs
  coordinator?: string; // Priest ID of unit coordinator
  sharedPriests: string[]; // Priest IDs that serve multiple parishes
  
  // Admin fields
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ===== USER TYPES =====

export interface User {
  id: string;
  email: string;
  name: string;
  preferredLanguage?: string;
  timezone?: string;
  
  // Admin fields
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// ===== API RESPONSE TYPES =====

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  nextToken?: string;
}

export interface PublicEventsResponse {
  '@context': 'https://schema.org';
  '@type': 'EventSeries';
  name: string;
  description?: string;
  location: {
    '@type': 'Place';
    name: string;
    address: PostalAddress;
    geo?: {
      '@type': 'GeoCoordinates';
      latitude: number;
      longitude: number;
    };
  };
  organizer: {
    '@type': 'Organization';
    name: string;
    url?: string;
  };
  events: PublicEvent[];
}

export interface PublicEvent {
  '@type': 'Event';
  name: string;
  description?: string;
  eventType: EventType;
  startDate: string;
  endDate?: string;
  location: {
    '@type': 'Place';
    name: string;
  };
  performer?: {
    '@type': 'Person';
    name: string;
    jobTitle: string;
  }[];
  additionalType?: string; // Wikidata URL
}

// ===== FORM TYPES =====

export interface EventFormData {
  name: string;
  eventType: EventType;
  description?: string;
  locationId: string;
  celebrantId?: string;
  assistantIds: string[];
  isRecurring: boolean;
  specificDate?: string;
  schedule: EventSchedule;
  additionalType?: string;
  image?: string;
}

export interface LocationFormData {
  name: string;
  isDefault: boolean;
  address: PostalAddress;
  coordinates?: {
    latitude: number | null;
    longitude: number | null;
  };
  osmNode?: string;
}

export interface PriestFormData {
  title: string;
  name: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  isParishPriest: boolean;
  isActive: boolean;
  ordainedDate?: string;
  diocese?: string;
  languages: string[];
  specialties?: string;
}