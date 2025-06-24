export interface GeolocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Using OpenStreetMap Nominatim API for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CleanMyHouse-TimeTracking/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }
    
    const data = await response.json();
    
    if (data.display_name) {
      return data.display_name;
    }
    
    // Fallback to coordinates if no address found
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    // Return coordinates as fallback
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}
