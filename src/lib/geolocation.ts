export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  isFallback?: boolean;
}

// Try to get location from IP-based service as fallback
async function getLocationFromIP(): Promise<GeolocationResult> {
  const services = [
    { url: 'https://ipapi.co/json/', lat: 'latitude', lon: 'longitude' },
    { url: 'https://ip-api.com/json/', lat: 'lat', lon: 'lon' },
    { url: 'https://freeipapi.com/api/json', lat: 'latitude', lon: 'longitude' },
    { url: 'https://geolocation-db.com/json/', lat: 'latitude', lon: 'longitude' },
    { url: 'https://api.ipify.org?format=json', lat: null, lon: null } // Just for fallback detection
  ];

  for (const service of services) {
    try {
      const response = await fetch(service.url, { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000) 
      });
      if (!response.ok) continue;
      const data = await response.json();
      
      if (!service.lat) {
        // If we only got IP, try one more geo service with that IP
        const ip = data.ip;
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
        const geoData = await geoRes.json();
        if (geoData.latitude) {
          return {
            latitude: Number(geoData.latitude),
            longitude: Number(geoData.longitude),
            accuracy: 5000,
            isFallback: true
          };
        }
        continue;
      }

      const lat = data[service.lat];
      const lon = data[service.lon];

      if (lat !== undefined && lon !== undefined && lat !== 0) {
        return {
          latitude: Number(lat),
          longitude: Number(lon),
          accuracy: 5000,
          isFallback: true
        };
      }
    } catch (e) {
      console.warn(`IP location service ${service.url} failed:`, e);
    }
  }

  // Final hard fallback to Surat, India (21.1702, 72.8311)
  // This ensures the application never crashes due to missing location
  return {
    latitude: 21.1702,
    longitude: 72.8311,
    accuracy: 100000,
    isFallback: true
  };
}

export async function getCurrentPosition(options?: PositionOptions): Promise<GeolocationResult> {
  if (typeof window === 'undefined') {
    return { latitude: 0, longitude: 0, accuracy: 0, isFallback: true };
  }

  // Check if running in iframe
  const isInIframe = window.self !== window.top;
  
  // If in iframe, browser geolocation often fails or is blocked without specific permissions
  // We'll try it but expect to fall back
  
  if (!("geolocation" in navigator)) {
    return await getLocationFromIP();
  }

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: false, // Low accuracy is faster and more likely to succeed in restricted envs
    timeout: 5000,
    maximumAge: 60000,
    ...options
  };

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, defaultOptions);
    });
    
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      isFallback: false
    };
    } catch (err: any) {
      // Silently fall back to IP location
      return await getLocationFromIP();
    }
  }


// Add a helper to check if geolocation is allowed
export async function checkGeolocationPermission(): Promise<PermissionState | "unsupported"> {
  if (!("permissions" in navigator)) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as any });
    return status.state;
  } catch (e) {
    return "unsupported";
  }
}

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location access denied. Please enable permissions in your browser settings.";
    case error.POSITION_UNAVAILABLE:
      return "Location information is unavailable at this time.";
    case error.TIMEOUT:
      return "Location request timed out. Please try again.";
    default:
      return "An unknown geolocation error occurred.";
  }
}
