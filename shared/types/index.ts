// Shared Types for Parish Events App
// Used by both frontend and backend

export interface Parish {
  id: string;
  name: string;
  description?: string;
  website?: string;
  timezone: string; // IANA timezone (e.g., "Europe/Madrid")
  locations: ParishLocation[];
  priests: Priest[];
  createdAt: string;
  updatedAt: string;
  createdBy: string; // user ID
}

export interface ParishLocation {
  id: string;
  name: string;
  address: PostalAddress;
  osmNode?: string; // OpenStreetMap node ID
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault?: boolean; // primary location for this parish
}

export interface PostalAddress {
  streetAddress?: string;
  addressLocality?: string; // city
  postalCode?: string;
  addressRegion?: string; // state/province
  addressCountry: string; // ISO 2-letter code
}

export interface Priest {
  id: string;
  name: string;
  title?: string; // "Fr.", "Msgr.", "Bishop", etc.
  email?: string;
  active: boolean;
  parishId: string;
}

export interface ParishEvent {
  id: string;
  parishId: string;
  name: string;
  description?: string;
  eventType: EventType;
  locationId: string; // references ParishLocation.id
  celebrantId?: string; // references Priest.id
  assistantIds?: string[]; // references Priest.id[]
  
  // Scheduling
  isRecurring: boolean;
  schedule?: EventSchedule;
  specificDate?: string; // ISO date for one-off events
  
  // JSON-LD generation
  additionalType?: string; // Wikidata URL for event type
  image?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string; // user ID
}

export interface EventSchedule {
  startTime: string; // HH:MM format
  endTime?: string; // HH:MM format
  byDay: WeekDay[]; // days of week
  repeatFrequency: RepeatFrequency;
  startDate?: string; // ISO date when schedule starts
  endDate?: string; // ISO date when schedule ends
  exceptDates?: string[]; // ISO dates to exclude
}

export type WeekDay = 
  | "Monday" | "Tuesday" | "Wednesday" | "Thursday" 
  | "Friday" | "Saturday" | "Sunday";

export type RepeatFrequency = 
  | "P1W" // weekly
  | "P1M" // monthly  
  | "P1Y"; // yearly

export type EventType = 
  | "mass"
  | "adoration" 
  | "confession"
  | "vespers"
  | "rosary"
  | "meeting"
  | "celebration"
  | "other";

// User & Permissions
export interface User {
  id: string; // Cognito user ID
  email: string;
  name?: string;
  parishMemberships: ParishMembership[];
  createdAt: string;
}

export interface ParishMembership {
  parishId: string;
  role: ParishRole;
  invitedBy?: string; // user ID who sent invitation
  joinedAt: string;
}

export type ParishRole = 
  | "admin"     // full parish management
  | "manager"   // create/edit events
  | "viewer";   // read-only

// API Responses
export interface ParishEventsPublicResponse {
  parish: {
    name: string;
    website?: string;
  };
  events: JsonLdEvent[];
  generatedAt: string;
}

// Schema.org Event in JSON-LD format
export interface JsonLdEvent {
  "@context": "https://schema.org";
  "@type": "Event";
  name: string;
  additionalType?: string; // Wikidata URL
  description?: string;
  image?: string;
  startDate?: string; // ISO datetime for specific events
  endDate?: string; // ISO datetime for specific events
  eventSchedule?: JsonLdSchedule; // for recurring events
  location: JsonLdPlace;
  performer?: JsonLdPerson[]; // celebrating priests
}

export interface JsonLdSchedule {
  "@type": "Schedule";
  byDay: string | string[]; // schema.org day URLs
  startTime: string; // HH:MM
  endTime?: string; // HH:MM
  repeatFrequency: string; // ISO duration
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  exceptDate?: string[]; // ISO dates
  scheduleTimezone: string; // IANA timezone
}

export interface JsonLdPlace {
  "@type": "Place";
  name: string;
  sameAs?: string; // OpenStreetMap URL
  address?: JsonLdPostalAddress;
}

export interface JsonLdPostalAddress {
  "@type": "PostalAddress";
  streetAddress?: string;
  addressLocality?: string;
  postalCode?: string;
  addressRegion?: string;
  addressCountry: string;
}

export interface JsonLdPerson {
  "@type": "Person";
  name: string;
  jobTitle?: string; // "Main Celebrant", "Assistant"
}

// DynamoDB Key Patterns
// PK = "PARISH#{parishId}" | "USER#{userId}" | "EVENT#{eventId}"
// SK = "METADATA" | "LOCATION#{locationId}" | "PRIEST#{priestId}" | "MEMBER#{userId}" | "EVENT#{eventId}"

export interface DynamoDBRecord {
  pk: string;
  sk: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}