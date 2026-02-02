/**
 * Conflict Detection Service
 * 
 * Detects scheduling conflicts for parish events, including:
 * - Time overlaps for the same location
 * - Priest availability conflicts
 * - Liturgical calendar conflicts
 * - Resource constraints
 */

import type { ParishEvent, Priest, ParishLocation } from '@/shared/types';
import { liturgicalCalendar } from './liturgicalCalendar';

export interface ScheduleConflict {
  type: 'time_overlap' | 'priest_conflict' | 'liturgical_conflict' | 'resource_conflict';
  severity: 'error' | 'warning' | 'info';
  message: string;
  conflictingEvents: ParishEvent[];
  suggestions?: string[];
}

export interface ConflictCheckOptions {
  ignoreEventId?: string; // For editing existing events
  checkPriests?: boolean;
  checkLocations?: boolean;
  checkLiturgical?: boolean;
}

export class ConflictDetectionService {
  
  /**
   * Check for conflicts when scheduling a new event
   */
  checkEventConflicts(
    newEvent: Partial<ParishEvent>, 
    existingEvents: ParishEvent[],
    priests: Priest[],
    locations: ParishLocation[],
    options: ConflictCheckOptions = {}
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    
    // Filter out the event being edited
    const eventsToCheck = options.ignoreEventId 
      ? existingEvents.filter(e => e.id !== options.ignoreEventId)
      : existingEvents;
    
    // Check time and location conflicts
    if (options.checkLocations !== false) {
      conflicts.push(...this.checkTimeLocationConflicts(newEvent, eventsToCheck));
    }
    
    // Check priest availability
    if (options.checkPriests !== false) {
      conflicts.push(...this.checkPriestConflicts(newEvent, eventsToCheck, priests));
    }
    
    // Check liturgical calendar appropriateness
    if (options.checkLiturgical !== false) {
      conflicts.push(...this.checkLiturgicalConflicts(newEvent));
    }
    
    // Check for optimal scheduling suggestions
    conflicts.push(...this.generateSchedulingSuggestions(newEvent, eventsToCheck));
    
    return conflicts.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  /**
   * Check for time and location conflicts
   */
  private checkTimeLocationConflicts(
    newEvent: Partial<ParishEvent>, 
    existingEvents: ParishEvent[]
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    
    if (!newEvent.locationId || !newEvent.schedule?.startTime) {
      return conflicts;
    }
    
    const newEventTimes = this.getEventTimes(newEvent);
    
    for (const eventTime of newEventTimes) {
      const conflictingEvents = existingEvents.filter(existingEvent => {
        // Must be same location
        if (existingEvent.locationId !== newEvent.locationId) return false;
        
        const existingEventTimes = this.getEventTimes(existingEvent);
        
        return existingEventTimes.some(existingTime => 
          this.timesOverlap(eventTime, existingTime)
        );
      });
      
      if (conflictingEvents.length > 0) {
        conflicts.push({
          type: 'time_overlap',
          severity: 'error',
          message: `Time conflict detected at ${this.getLocationName(newEvent.locationId!, [])} on ${this.formatDate(eventTime.date)} at ${eventTime.startTime}`,
          conflictingEvents,
          suggestions: [
            'Choose a different time slot',
            'Use a different location',
            'Consider moving the conflicting event'
          ]
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Check for priest availability conflicts
   */
  private checkPriestConflicts(
    newEvent: Partial<ParishEvent>,
    existingEvents: ParishEvent[],
    priests: Priest[]
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    
    const allPriestIds = [
      ...(newEvent.celebrantId ? [newEvent.celebrantId] : []),
      ...(newEvent.assistantIds || [])
    ];
    
    if (allPriestIds.length === 0) return conflicts;
    
    const newEventTimes = this.getEventTimes(newEvent);
    
    for (const eventTime of newEventTimes) {
      for (const priestId of allPriestIds) {
        const conflictingEvents = existingEvents.filter(existingEvent => {
          const existingPriestIds = [
            ...(existingEvent.celebrantId ? [existingEvent.celebrantId] : []),
            ...(existingEvent.assistantIds || [])
          ];
          
          if (!existingPriestIds.includes(priestId)) return false;
          
          const existingEventTimes = this.getEventTimes(existingEvent);
          
          return existingEventTimes.some(existingTime => 
            this.timesOverlap(eventTime, existingTime)
          );
        });
        
        if (conflictingEvents.length > 0) {
          const priest = priests.find(p => p.id === priestId);
          const priestName = priest?.name || 'Unknown Priest';
          
          conflicts.push({
            type: 'priest_conflict',
            severity: 'error',
            message: `${priestName} is already scheduled for another event on ${this.formatDate(eventTime.date)} at ${eventTime.startTime}`,
            conflictingEvents,
            suggestions: [
              'Choose a different priest',
              'Reschedule one of the conflicting events',
              'Consider if both events really need this priest'
            ]
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Check liturgical calendar appropriateness
   */
  private checkLiturgicalConflicts(newEvent: Partial<ParishEvent>): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    
    const eventTimes = this.getEventTimes(newEvent);
    
    for (const eventTime of eventTimes) {
      const liturgicalDay = liturgicalCalendar.getLiturgicalDay(new Date(eventTime.date));
      
      // Check for inappropriate events during solemn periods
      if (this.isInappropriateForSeason(newEvent.eventType!, liturgicalDay.season)) {
        conflicts.push({
          type: 'liturgical_conflict',
          severity: 'warning',
          message: `${newEvent.eventType} events may not be appropriate during ${liturgicalDay.season}`,
          conflictingEvents: [],
          suggestions: [
            `Consider a different event type more suitable for ${liturgicalDay.season}`,
            'Check with pastor for appropriateness',
            'Review liturgical calendar guidelines'
          ]
        });
      }
      
      // Check for major feast days
      if (liturgicalDay.isHolyDay && this.isSecularEvent(newEvent.eventType!)) {
        conflicts.push({
          type: 'liturgical_conflict',
          severity: 'warning',
          message: `${liturgicalDay.name} is a holy day - secular events should be carefully considered`,
          conflictingEvents: [],
          suggestions: [
            'Consider rescheduling non-liturgical events',
            'Ensure event complements the holy day',
            'Check diocesan guidelines for holy day scheduling'
          ]
        });
      }
      
      // Suggest appropriate events for the season
      if (liturgicalDay.suggestedEvents?.length) {
        const suggestions = liturgicalDay.suggestedEvents
          .filter(s => s.type !== newEvent.eventType)
          .map(s => s.name);
        
        if (suggestions.length > 0) {
          conflicts.push({
            type: 'liturgical_conflict',
            severity: 'info',
            message: `Other events recommended for ${liturgicalDay.season}: ${suggestions.slice(0, 2).join(', ')}`,
            conflictingEvents: [],
            suggestions: suggestions.slice(0, 3)
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Generate scheduling optimization suggestions
   */
  private generateSchedulingSuggestions(
    newEvent: Partial<ParishEvent>,
    existingEvents: ParishEvent[]
  ): ScheduleConflict[] {
    const suggestions: ScheduleConflict[] = [];
    
    // Check for optimal Mass times
    if (newEvent.eventType === 'mass' && newEvent.schedule?.startTime) {
      const massTime = newEvent.schedule.startTime;
      const dayOfWeek = this.getDayOfWeek(newEvent);
      
      if (this.isMassTimeOptimal(massTime, dayOfWeek)) {
        suggestions.push({
          type: 'resource_conflict',
          severity: 'info',
          message: 'Mass time follows recommended parish scheduling patterns',
          conflictingEvents: [],
          suggestions: ['Consider adding additional Mass times if needed']
        });
      } else {
        const optimalTimes = this.getOptimalMassTimes(dayOfWeek);
        suggestions.push({
          type: 'resource_conflict',
          severity: 'info',
          message: `Consider optimal Mass times for ${dayOfWeek}: ${optimalTimes.join(', ')}`,
          conflictingEvents: [],
          suggestions: optimalTimes.map(time => `Schedule Mass at ${time}`)
        });
      }
    }
    
    // Check for priest workload
    if (newEvent.celebrantId) {
      const priestEvents = existingEvents.filter(e => 
        e.celebrantId === newEvent.celebrantId || 
        e.assistantIds?.includes(newEvent.celebrantId!)
      );
      
      if (this.isPriestOverloaded(priestEvents, newEvent)) {
        suggestions.push({
          type: 'priest_conflict',
          severity: 'warning',
          message: 'This priest may be overloaded with events',
          conflictingEvents: priestEvents,
          suggestions: [
            'Consider distributing events among other priests',
            'Check if assistant priests could celebrate some events',
            'Review priest availability and preferences'
          ]
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Get all occurrence times for an event (handles recurring events)
   */
  private getEventTimes(event: Partial<ParishEvent>): Array<{date: string, startTime: string, endTime?: string}> {
    const times: Array<{date: string, startTime: string, endTime?: string}> = [];
    
    if (!event.schedule?.startTime) return times;
    
    if (event.specificDate) {
      // One-time event
      times.push({
        date: event.specificDate,
        startTime: event.schedule.startTime,
        endTime: event.schedule.endTime
      });
    } else if (event.isRecurring && event.schedule) {
      // Recurring event - generate next 30 days of occurrences
      const startDate = new Date(event.schedule.startDate || new Date());
      const endDate = new Date(event.schedule.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        if (event.schedule.byDay.includes(dayName as any)) {
          const dateStr = date.toISOString().split('T')[0];
          
          // Skip exception dates
          if (event.schedule.exceptDates?.includes(dateStr)) continue;
          
          times.push({
            date: dateStr,
            startTime: event.schedule.startTime,
            endTime: event.schedule.endTime
          });
        }
      }
    }
    
    return times;
  }

  /**
   * Check if two time slots overlap
   */
  private timesOverlap(
    time1: {date: string, startTime: string, endTime?: string},
    time2: {date: string, startTime: string, endTime?: string}
  ): boolean {
    // Must be same date
    if (time1.date !== time2.date) return false;
    
    const start1 = this.timeToMinutes(time1.startTime);
    const end1 = time1.endTime ? this.timeToMinutes(time1.endTime) : start1 + 60; // Default 1 hour
    
    const start2 = this.timeToMinutes(time2.startTime);
    const end2 = time2.endTime ? this.timeToMinutes(time2.endTime) : start2 + 60; // Default 1 hour
    
    return start1 < end2 && start2 < end1;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  private getLocationName(locationId: string, locations: ParishLocation[]): string {
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'Unknown Location';
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'error': return 3;
      case 'warning': return 2;
      case 'info': return 1;
      default: return 0;
    }
  }

  private isInappropriateForSeason(eventType: string, season: string): boolean {
    // Wedding restrictions during Lent and Advent
    if ((season === 'Lent' || season === 'Advent') && eventType === 'wedding') {
      return true;
    }
    
    // Celebration restrictions during solemn periods
    if (season === 'Lent' && (eventType === 'celebration' || eventType === 'wedding')) {
      return true;
    }
    
    return false;
  }

  private isSecularEvent(eventType: string): boolean {
    const secularEvents = ['meeting', 'celebration', 'wedding'];
    return secularEvents.includes(eventType);
  }

  private getDayOfWeek(event: Partial<ParishEvent>): string {
    if (event.specificDate) {
      const date = new Date(event.specificDate);
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    if (event.schedule?.byDay?.[0]) {
      return event.schedule.byDay[0];
    }
    return 'Sunday';
  }

  private isMassTimeOptimal(time: string, dayOfWeek: string): boolean {
    const optimalTimes = this.getOptimalMassTimes(dayOfWeek);
    return optimalTimes.includes(time);
  }

  private getOptimalMassTimes(dayOfWeek: string): string[] {
    switch (dayOfWeek) {
      case 'Sunday':
        return ['08:00', '10:00', '12:00', '18:00'];
      case 'Saturday':
        return ['18:00', '19:00']; // Vigil masses
      default:
        return ['09:00', '18:00']; // Weekdays
    }
  }

  private isPriestOverloaded(priestEvents: ParishEvent[], newEvent: Partial<ParishEvent>): boolean {
    // Simple check: more than 3 events per week might be overloaded
    const weeklyEvents = priestEvents.filter(event => {
      const eventTimes = this.getEventTimes(event);
      const thisWeek = this.getCurrentWeekDates();
      
      return eventTimes.some(time => 
        thisWeek.some(weekDate => weekDate.toISOString().split('T')[0] === time.date)
      );
    });
    
    return weeklyEvents.length >= 3;
  }

  private getCurrentWeekDates(): Date[] {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    
    return weekDates;
  }
}

// Singleton instance
export const conflictDetection = new ConflictDetectionService();