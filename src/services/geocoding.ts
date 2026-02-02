/**
 * Geocoding Service
 * 
 * Provides address geocoding and reverse geocoding using OpenStreetMap's Nominatim API.
 * Includes Catholic-specific place search and validation.
 */

export interface GeocodingResult {
  displayName: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
  placeId: number;
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  importance: number;
  type: string;
  class: string;
}

export interface CatholicPlace {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  osmId: number;
  type: 'church' | 'cathedral' | 'chapel' | 'monastery' | 'abbey';
  denomination?: string;
  website?: string;
}

export class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private readonly userAgent = 'ParishEventsApp/1.0';

  /**
   * Search for addresses and places
   */
  async search(query: string, options?: {
    limit?: number;
    countryCode?: string;
    addressOnly?: boolean;
    catholicOnly?: boolean;
  }): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: String(options?.limit || 5),
      'accept-language': 'en',
    });

    if (options?.countryCode) {
      params.append('countrycodes', options.countryCode);
    }

    if (options?.addressOnly) {
      params.append('dedupe', '1');
    }

    // For Catholic-specific searches, add relevant terms
    if (options?.catholicOnly) {
      const catholicQuery = `${query} church cathedral chapel catholic`;
      params.set('q', catholicQuery);
    }

    try {
      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Geocoding search error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
      addressdetails: '1',
      'accept-language': 'en',
    });

    try {
      const response = await fetch(`${this.baseUrl}/reverse?${params}`, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Search specifically for Catholic places (churches, cathedrals, chapels)
   */
  async searchCatholicPlaces(query: string, options?: {
    limit?: number;
    countryCode?: string;
    radius?: number; // in km
    centerLat?: number;
    centerLon?: number;
  }): Promise<CatholicPlace[]> {
    let searchQuery = query;
    
    // Add Catholic-specific terms
    const catholicTerms = ['church', 'cathedral', 'chapel', 'basilica', 'parish'];
    const hasReligiousTerms = catholicTerms.some(term => 
      query.toLowerCase().includes(term)
    );
    
    if (!hasReligiousTerms) {
      searchQuery = `${query} catholic church`;
    }

    const results = await this.search(searchQuery, {
      limit: options?.limit || 10,
      countryCode: options?.countryCode
    });

    // Filter and transform results to Catholic places
    const catholicPlaces: CatholicPlace[] = [];

    for (const result of results) {
      if (this.isCatholicPlace(result)) {
        const place: CatholicPlace = {
          name: this.extractPlaceName(result),
          address: result.displayName,
          coordinates: {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon)
          },
          osmId: result.osmId,
          type: this.determinePlaceType(result),
          denomination: this.extractDenomination(result)
        };

        // Apply radius filter if specified
        if (options?.centerLat && options?.centerLon && options?.radius) {
          const distance = this.calculateDistance(
            options.centerLat, options.centerLon,
            place.coordinates.lat, place.coordinates.lon
          );
          if (distance > options.radius) continue;
        }

        catholicPlaces.push(place);
      }
    }

    return catholicPlaces.sort((a, b) => b.coordinates.lat - a.coordinates.lat);
  }

  /**
   * Get detailed information about a specific OSM place
   */
  async getPlaceDetails(osmType: string, osmId: number): Promise<any> {
    const params = new URLSearchParams({
      osm_type: osmType.charAt(0).toUpperCase(), // N, W, R
      osm_id: String(osmId),
      format: 'json',
      addressdetails: '1',
      extratags: '1',
      namedetails: '1'
    });

    try {
      const response = await fetch(`${this.baseUrl}/lookup?${params}`, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        throw new Error(`Place details API error: ${response.status}`);
      }

      const results = await response.json();
      return results[0] || null;
    } catch (error) {
      console.error('Place details error:', error);
      return null;
    }
  }

  /**
   * Validate an address and get standardized components
   */
  async validateAddress(address: string, countryCode?: string): Promise<{
    isValid: boolean;
    standardized?: GeocodingResult;
    suggestions?: GeocodingResult[];
  }> {
    const results = await this.search(address, {
      limit: 3,
      countryCode,
      addressOnly: true
    });

    if (results.length === 0) {
      return { isValid: false, suggestions: [] };
    }

    const bestMatch = results[0];
    const isExactMatch = this.isExactAddressMatch(address, bestMatch);

    return {
      isValid: isExactMatch,
      standardized: bestMatch,
      suggestions: isExactMatch ? [] : results
    };
  }

  private isCatholicPlace(result: GeocodingResult): boolean {
    const catholicTerms = [
      'catholic', 'cathedral', 'basilica', 'parish', 'church',
      'chapel', 'shrine', 'abbey', 'monastery', 'convent'
    ];

    const name = result.displayName.toLowerCase();
    const type = result.type.toLowerCase();
    const className = result.class.toLowerCase();

    return catholicTerms.some(term => 
      name.includes(term) || type.includes(term) || className.includes(term)
    ) && (
      className === 'amenity' || 
      className === 'building' ||
      className === 'historic'
    );
  }

  private extractPlaceName(result: GeocodingResult): string {
    const displayName = result.displayName;
    // Extract the main name (usually the first part before the first comma)
    const parts = displayName.split(',');
    return parts[0].trim();
  }

  private determinePlaceType(result: GeocodingResult): CatholicPlace['type'] {
    const name = result.displayName.toLowerCase();
    
    if (name.includes('cathedral')) return 'cathedral';
    if (name.includes('chapel')) return 'chapel';
    if (name.includes('monastery')) return 'monastery';
    if (name.includes('abbey')) return 'abbey';
    
    return 'church'; // Default
  }

  private extractDenomination(result: GeocodingResult): string | undefined {
    const name = result.displayName.toLowerCase();
    
    if (name.includes('catholic')) return 'Catholic';
    if (name.includes('orthodox')) return 'Orthodox';
    if (name.includes('anglican') || name.includes('episcopal')) return 'Anglican';
    if (name.includes('lutheran')) return 'Lutheran';
    if (name.includes('baptist')) return 'Baptist';
    if (name.includes('methodist')) return 'Methodist';
    
    return undefined;
  }

  private isExactAddressMatch(query: string, result: GeocodingResult): boolean {
    const queryNormalized = query.toLowerCase().replace(/[^\w\s]/g, '');
    const resultNormalized = result.displayName.toLowerCase().replace(/[^\w\s]/g, '');
    
    // Simple similarity check
    const similarity = this.calculateStringSimilarity(queryNormalized, resultNormalized);
    return similarity > 0.8;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1, // substitution
            matrix[j][i - 1] + 1,     // insertion
            matrix[j - 1][i] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// Singleton instance
export const geocodingService = new GeocodingService();