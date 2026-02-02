/**
 * Liturgical Calendar Service
 * 
 * Provides Catholic liturgical calendar data and suggestions for parish events.
 * Integrates with the universal liturgical year and provides localized support.
 */

export interface LiturgicalDay {
  date: string;
  season: LiturgicalSeason;
  rank: LiturgicalRank;
  name: string;
  color: LiturgicalColor;
  readings?: {
    first?: string;
    psalm?: string;
    second?: string;
    gospel?: string;
  };
  isHolyDay?: boolean;
  isSunday?: boolean;
  massFormulas?: string[];
  suggestedEvents?: EventSuggestion[];
}

export type LiturgicalSeason = 
  | 'Advent' 
  | 'Christmas' 
  | 'Ordinary Time' 
  | 'Lent' 
  | 'Easter Triduum' 
  | 'Easter';

export type LiturgicalRank = 
  | 'Solemnity' 
  | 'Feast' 
  | 'Memorial' 
  | 'Optional Memorial' 
  | 'Weekday' 
  | 'Sunday';

export type LiturgicalColor = 
  | 'white' 
  | 'red' 
  | 'green' 
  | 'purple' 
  | 'rose' 
  | 'black';

export interface EventSuggestion {
  type: 'mass' | 'adoration' | 'confession' | 'devotion';
  name: string;
  description: string;
  recommendedTime?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MassTiming {
  dayOfWeek: string;
  recommendedTimes: string[];
  description: string;
}

export class LiturgicalCalendarService {
  
  /**
   * Get liturgical information for a specific date
   */
  getLiturgicalDay(date: Date): LiturgicalDay {
    const year = date.getFullYear();
    const easterDate = this.calculateEaster(year);
    const dayOfYear = this.getDayOfYear(date);
    
    // Calculate liturgical season and specific celebrations
    const season = this.calculateSeason(date, easterDate);
    const rank = this.calculateRank(date, season, easterDate);
    const color = this.getLiturgicalColor(date, season, rank);
    const name = this.getLiturgicalName(date, season, rank, easterDate);
    
    return {
      date: date.toISOString().split('T')[0],
      season,
      rank,
      name,
      color,
      isHolyDay: this.isHolyDay(date, easterDate),
      isSunday: date.getDay() === 0,
      suggestedEvents: this.getSuggestedEvents(date, season, rank)
    };
  }

  /**
   * Get suggested Mass times for different days of the week
   */
  getRecommendedMassTimes(): MassTiming[] {
    return [
      {
        dayOfWeek: 'Sunday',
        recommendedTimes: ['08:00', '10:00', '12:00', '18:00'],
        description: 'Primary celebration day - multiple Masses recommended'
      },
      {
        dayOfWeek: 'Monday',
        recommendedTimes: ['09:00', '18:00'],
        description: 'Weekday Mass - morning and evening options'
      },
      {
        dayOfWeek: 'Tuesday',
        recommendedTimes: ['09:00', '18:00'],
        description: 'Weekday Mass - morning and evening options'
      },
      {
        dayOfWeek: 'Wednesday',
        recommendedTimes: ['09:00', '18:00'],
        description: 'Weekday Mass - morning and evening options'
      },
      {
        dayOfWeek: 'Thursday',
        recommendedTimes: ['09:00', '18:00'],
        description: 'Weekday Mass - morning and evening options'
      },
      {
        dayOfWeek: 'Friday',
        recommendedTimes: ['09:00', '18:00'],
        description: 'Weekday Mass - consider Stations of the Cross'
      },
      {
        dayOfWeek: 'Saturday',
        recommendedTimes: ['09:00', '18:00'],
        description: 'Weekday Mass and vigil options'
      }
    ];
  }

  /**
   * Get special events for major liturgical celebrations
   */
  getSpecialCelebrations(year: number): LiturgicalDay[] {
    const easter = this.calculateEaster(year);
    const celebrations: LiturgicalDay[] = [];

    // Major celebrations
    const majorFeasts = [
      { name: 'Christmas', date: new Date(year, 11, 25), rank: 'Solemnity' as LiturgicalRank },
      { name: 'Epiphany', date: new Date(year, 0, 6), rank: 'Solemnity' as LiturgicalRank },
      { name: 'Ash Wednesday', date: this.addDays(easter, -46), rank: 'Weekday' as LiturgicalRank },
      { name: 'Palm Sunday', date: this.addDays(easter, -7), rank: 'Sunday' as LiturgicalRank },
      { name: 'Holy Thursday', date: this.addDays(easter, -3), rank: 'Solemnity' as LiturgicalRank },
      { name: 'Good Friday', date: this.addDays(easter, -2), rank: 'Solemnity' as LiturgicalRank },
      { name: 'Easter Vigil', date: this.addDays(easter, -1), rank: 'Solemnity' as LiturgicalRank },
      { name: 'Easter Sunday', date: easter, rank: 'Solemnity' as LiturgicalRank },
      { name: 'Ascension', date: this.addDays(easter, 39), rank: 'Solemnity' as LiturgicalRank },
      { name: 'Pentecost', date: this.addDays(easter, 49), rank: 'Solemnity' as LiturgicalRank },
      { name: 'Trinity Sunday', date: this.addDays(easter, 56), rank: 'Solemnity' as LiturgicalRank },
      { name: 'Corpus Christi', date: this.addDays(easter, 60), rank: 'Solemnity' as LiturgicalRank },
    ];

    return majorFeasts.map(feast => ({
      date: feast.date.toISOString().split('T')[0],
      season: this.calculateSeason(feast.date, easter),
      rank: feast.rank,
      name: feast.name,
      color: this.getLiturgicalColor(feast.date, this.calculateSeason(feast.date, easter), feast.rank),
      isHolyDay: true,
      isSunday: feast.date.getDay() === 0,
      suggestedEvents: this.getSpecialEventSuggestions(feast.name)
    }));
  }

  /**
   * Calculate Easter date for a given year using the algorithm
   */
  private calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month - 1, day);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private calculateSeason(date: Date, easter: Date): LiturgicalSeason {
    const year = date.getFullYear();
    const christmas = new Date(year - 1, 11, 25);
    const epiphany = new Date(year, 0, 6);
    const ashWednesday = this.addDays(easter, -46);
    const palmSunday = this.addDays(easter, -7);
    const easterVigil = this.addDays(easter, -1);
    const pentecost = this.addDays(easter, 49);
    const advent = this.getAdventStart(year);

    if (date >= christmas && date <= epiphany) {
      return 'Christmas';
    }
    if (date >= ashWednesday && date < easterVigil) {
      return 'Lent';
    }
    if (date >= easterVigil && date <= pentecost) {
      return 'Easter';
    }
    if (date >= advent) {
      return 'Advent';
    }
    
    return 'Ordinary Time';
  }

  private calculateRank(date: Date, season: LiturgicalSeason, easter: Date): LiturgicalRank {
    if (date.getDay() === 0) return 'Sunday';
    
    // Check for major solemnities and feasts
    const holyDays = this.getHolyDays(date.getFullYear(), easter);
    const holyDay = holyDays.find(day => 
      day.getTime() === date.getTime()
    );
    
    if (holyDay) {
      // Major solemnities
      const solemnities = [
        'Christmas', 'Epiphany', 'Easter', 'Ascension', 
        'Pentecost', 'Trinity Sunday', 'Corpus Christi'
      ];
      // This is simplified - in practice you'd need a proper lookup
      return 'Solemnity';
    }
    
    return 'Weekday';
  }

  private getLiturgicalColor(date: Date, season: LiturgicalSeason, rank: LiturgicalRank): LiturgicalColor {
    // Simplified color determination
    switch (season) {
      case 'Advent':
      case 'Lent':
        return 'purple';
      case 'Christmas':
      case 'Easter':
        return 'white';
      case 'Ordinary Time':
        return 'green';
      default:
        return 'green';
    }
  }

  private getLiturgicalName(date: Date, season: LiturgicalSeason, rank: LiturgicalRank, easter: Date): string {
    if (rank === 'Sunday') {
      const weekNumber = this.getWeekInSeason(date, season, easter);
      return `${weekNumber} Sunday of ${season}`;
    }
    
    // Check for specific celebrations
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (season === 'Ordinary Time') {
      const weekNumber = this.getWeekInOrdinaryTime(date, easter);
      return `${dayName} of the ${weekNumber} Week in Ordinary Time`;
    }
    
    return `${dayName} of ${season}`;
  }

  private isHolyDay(date: Date, easter: Date): boolean {
    const holyDays = this.getHolyDays(date.getFullYear(), easter);
    return holyDays.some(day => day.getTime() === date.getTime());
  }

  private getHolyDays(year: number, easter: Date): Date[] {
    return [
      new Date(year, 11, 25), // Christmas
      new Date(year, 0, 6),   // Epiphany
      easter,                 // Easter
      this.addDays(easter, 39), // Ascension
      this.addDays(easter, 49), // Pentecost
      this.addDays(easter, 60), // Corpus Christi
    ];
  }

  private getAdventStart(year: number): Date {
    const christmas = new Date(year, 11, 25);
    const dayOfWeek = christmas.getDay();
    const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const fourthSunday = this.addDays(christmas, daysToSunday - 7);
    return this.addDays(fourthSunday, -21); // 4 Sundays before
  }

  private getWeekInSeason(date: Date, season: LiturgicalSeason, easter: Date): string {
    // Simplified week calculation
    return '1st';
  }

  private getWeekInOrdinaryTime(date: Date, easter: Date): string {
    // Simplified week calculation for Ordinary Time
    return '1st';
  }

  private getSuggestedEvents(date: Date, season: LiturgicalSeason, rank: LiturgicalRank): EventSuggestion[] {
    const suggestions: EventSuggestion[] = [];
    
    // Basic Mass suggestion
    if (date.getDay() === 0) { // Sunday
      suggestions.push({
        type: 'mass',
        name: 'Sunday Mass',
        description: 'Principal celebration of the week',
        recommendedTime: '10:00',
        priority: 'high'
      });
    } else {
      suggestions.push({
        type: 'mass',
        name: 'Weekday Mass',
        description: 'Daily celebration',
        recommendedTime: '09:00',
        priority: 'medium'
      });
    }

    // Seasonal suggestions
    switch (season) {
      case 'Advent':
        suggestions.push({
          type: 'devotion',
          name: 'Advent Wreath Blessing',
          description: 'Traditional Advent devotion',
          recommendedTime: '17:00',
          priority: 'medium'
        });
        break;
        
      case 'Lent':
        if (date.getDay() === 5) { // Friday
          suggestions.push({
            type: 'devotion',
            name: 'Stations of the Cross',
            description: 'Traditional Friday devotion during Lent',
            recommendedTime: '18:00',
            priority: 'high'
          });
        }
        suggestions.push({
          type: 'confession',
          name: 'Confession',
          description: 'Increased availability during Lent',
          recommendedTime: '16:00',
          priority: 'medium'
        });
        break;
        
      case 'Easter':
        suggestions.push({
          type: 'adoration',
          name: 'Eucharistic Adoration',
          description: 'Extended adoration during Easter season',
          recommendedTime: '16:00',
          priority: 'medium'
        });
        break;
    }

    return suggestions;
  }

  private getSpecialEventSuggestions(celebration: string): EventSuggestion[] {
    const suggestions: EventSuggestion[] = [];
    
    switch (celebration) {
      case 'Christmas':
        suggestions.push(
          {
            type: 'mass',
            name: 'Christmas Vigil Mass',
            description: 'Christmas Eve celebration',
            recommendedTime: '18:00',
            priority: 'high'
          },
          {
            type: 'mass',
            name: 'Midnight Mass',
            description: 'Traditional midnight celebration',
            recommendedTime: '00:00',
            priority: 'high'
          },
          {
            type: 'mass',
            name: 'Christmas Day Mass',
            description: 'Christmas morning celebration',
            recommendedTime: '10:00',
            priority: 'high'
          }
        );
        break;
        
      case 'Easter Sunday':
        suggestions.push(
          {
            type: 'mass',
            name: 'Easter Vigil',
            description: 'Principal celebration of Easter',
            recommendedTime: '21:00',
            priority: 'high'
          },
          {
            type: 'mass',
            name: 'Easter Sunday Mass',
            description: 'Easter morning celebration',
            recommendedTime: '10:00',
            priority: 'high'
          }
        );
        break;
        
      case 'Palm Sunday':
        suggestions.push({
          type: 'mass',
          name: 'Palm Sunday Mass',
          description: 'Blessing of palms and passion reading',
          recommendedTime: '10:00',
          priority: 'high'
        });
        break;
        
      case 'Ash Wednesday':
        suggestions.push({
          type: 'mass',
          name: 'Ash Wednesday Mass',
          description: 'Distribution of ashes',
          recommendedTime: '18:00',
          priority: 'high'
        });
        break;
    }
    
    return suggestions;
  }
}

// Singleton instance
export const liturgicalCalendar = new LiturgicalCalendarService();