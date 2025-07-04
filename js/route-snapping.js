

class RouteSnappingService {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 500;
    }

    
    async snapToRoads(coordinates, options = {}) {
        if (!coordinates || coordinates.length < 2) {
            return coordinates;
        }

        let {
            profile = 'driving',
            simplify = true,
            maxPoints = 100
        } = options;

        
        if (options.profile === 'walking') {
            profile = 'walking';
        }

        
        let snappedInputCoords = coordinates;
        if (coordinates.length > 10) {
            snappedInputCoords = [];
            snappedInputCoords.push(coordinates[0]);
            const step = (coordinates.length - 1) / 9;
            for (let i = 1; i < 9; i++) {
                snappedInputCoords.push(coordinates[Math.round(i * step)]);
            }
            snappedInputCoords.push(coordinates[coordinates.length - 1]);
        }

        
        const cacheKey = this.generateCacheKey(snappedInputCoords, { ...options, profile });
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            Utils.showLoading('Snapping route to roads...');
            let snappedCoords = null;
            
            if (profile === 'walking') {
                snappedCoords = await this.tryORS(snappedInputCoords, { ...options, profile });
            }
            
            if (!snappedCoords || snappedCoords.length === 0) {
                snappedCoords = await this.tryMapbox(snappedInputCoords, { ...options, profile });
            }
            
            if (!snappedCoords || snappedCoords.length === 0) {
                snappedCoords = await this.tryOSRM(snappedInputCoords, { ...options, profile });
            }
            if (!snappedCoords || snappedCoords.length === 0) {
                snappedCoords = await this.tryGraphHopper(snappedInputCoords, { ...options, profile });
            }
            if (!snappedCoords || snappedCoords.length === 0) {
                
                if (profile === 'walking') {
                    snappedCoords = this.optimizeForWalking(coordinates);
                } else {
                    snappedCoords = await this.simulateRoadSnapping(coordinates, { ...options, profile });
                }
            }
            
            if (simplify && snappedCoords.length > maxPoints) {
                snappedCoords = this.simplifyRoute(snappedCoords, maxPoints);
            }
            
            this.cacheResult(cacheKey, snappedCoords);
            Utils.hideLoading();
            return snappedCoords;
        } catch (error) {
            console.error('Error snapping route to roads:', error);
            Utils.hideLoading();
            
            if (profile === 'walking') {
                return this.optimizeForWalking(coordinates);
            }
            
            return this.simulateRoadSnapping(coordinates, { ...options, profile });
        }
    }

    
    async tryOSRM(coordinates, options = {}) {
        try {
            const { profile = 'driving' } = options;
            
            
            const coords = coordinates.map(coord => `${coord[1]},${coord[0]}`).join(';');
            
            const osrmResponse = await fetch(
                `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`
            );
            
            if (!osrmResponse.ok) {
                throw new Error(`OSRM HTTP ${osrmResponse.status}`);
            }
            
            const data = await osrmResponse.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                if (route.geometry && route.geometry.coordinates) {
                    
                    return route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                }
            }
            
            return null;
            
        } catch (error) {
            console.warn('OSRM failed:', error);
            return null;
        }
    }

    
    async tryGraphHopper(coordinates, options = {}) {
        try {
            
            return null;
        } catch (error) {
            console.warn('GraphHopper failed:', error);
            return null;
        }
    }

    
    simulateRoadSnapping(coordinates, options = {}) {
        if (coordinates.length < 2) return coordinates;
        
        const { profile = 'driving', gridSize = 0.001 } = options;
        
        
        const snappedCoords = [];
        
        for (let i = 0; i < coordinates.length; i++) {
            const [lat, lng] = coordinates[i];
            
            
            const snappedLat = Math.round(lat / gridSize) * gridSize;
            const snappedLng = Math.round(lng / gridSize) * gridSize;
            
            
            let variation = 0;
            if (profile === 'walking') {
                variation = (Math.random() - 0.5) * gridSize * 0.5; 
            } else if (profile === 'cycling') {
                variation = (Math.random() - 0.5) * gridSize * 0.3; 
            } else {
                variation = (Math.random() - 0.5) * gridSize * 0.1; 
            }
            
            snappedCoords.push([snappedLat + variation, snappedLng + variation]);
        }
        
        
        return this.smoothRoute(snappedCoords);
    }

    
    smoothRoute(coordinates) {
        if (coordinates.length < 3) return coordinates;
        
        const smoothed = [coordinates[0]]; 
        
        for (let i = 1; i < coordinates.length - 1; i++) {
            const prev = coordinates[i - 1];
            const curr = coordinates[i];
            const next = coordinates[i + 1];
            
            
            const weight = 0.3;
            const smoothedLat = curr[0] * (1 - 2 * weight) + prev[0] * weight + next[0] * weight;
            const smoothedLng = curr[1] * (1 - 2 * weight) + prev[1] * weight + next[1] * weight;
            
            smoothed.push([smoothedLat, smoothedLng]);
        }
        
        smoothed.push(coordinates[coordinates.length - 1]); 
        return smoothed;
    }

    
    simplifyRoute(coordinates, maxPoints) {
        if (coordinates.length <= maxPoints) return coordinates;
        
        const simplified = [];
        const step = (coordinates.length - 1) / (maxPoints - 1);
        
        for (let i = 0; i < maxPoints; i++) {
            const index = Math.round(i * step);
            simplified.push(coordinates[index]);
        }
        
        return simplified;
    }

    
    interpolateRoute(coordinates, pointsPerSegment = 3) {
        if (coordinates.length < 2) return coordinates;
        
        const interpolated = [];
        
        for (let i = 0; i < coordinates.length - 1; i++) {
            const start = coordinates[i];
            const end = coordinates[i + 1];
            
            interpolated.push(start);
            
            
            for (let j = 1; j < pointsPerSegment; j++) {
                const factor = j / pointsPerSegment;
                const lat = Utils.interpolate(start[0], end[0], factor);
                const lng = Utils.interpolate(start[1], end[1], factor);
                interpolated.push([lat, lng]);
            }
        }
        
        interpolated.push(coordinates[coordinates.length - 1]);
        return interpolated;
    }

    
    optimizeForMode(coordinates, mode) {
        switch (mode) {
            case 'walking':
                return this.optimizeForWalking(coordinates);
            case 'cycling':
                return this.optimizeForCycling(coordinates);
            case 'driving':
                return this.optimizeForDriving(coordinates);
            default:
                return coordinates;
        }
    }

    
    optimizeForWalking(coordinates) {
        
        return this.smoothRoute(coordinates);
    }

    
    optimizeForCycling(coordinates) {
        
        const optimized = [];
        
        for (let i = 0; i < coordinates.length; i++) {
            const coord = coordinates[i];
            
            
            const variation = (Math.random() - 0.5) * 0.0001;
            optimized.push([coord[0] + variation, coord[1] + variation]);
        }
        
        return this.smoothRoute(optimized);
    }

    
    optimizeForDriving(coordinates) {
        
        return this.simulateRoadSnapping(coordinates, { profile: 'driving' });
    }

    
    generateCacheKey(coordinates, options) {
        if (coordinates.length === 0) return '';
        
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        const middle = coordinates[Math.floor(coordinates.length / 2)];
        
        const optionsStr = JSON.stringify(options);
        return `${first[0].toFixed(4)},${first[1].toFixed(4)}-${middle[0].toFixed(4)},${middle[1].toFixed(4)}-${last[0].toFixed(4)},${last[1].toFixed(4)}-${optionsStr}`;
    }

    
    cacheResult(key, coordinates) {
        
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, coordinates);
    }

    
    clearCache() {
        this.cache.clear();
    }

    
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize
        };
    }

    async tryMapbox(coordinates, options = {}) {
        try {
            const { profile = 'walking' } = options;
            const MAPBOX_TOKEN = window.MAPBOX_TOKEN;
            const coordsStr = coordinates.map(coord => `${coord[1]},${coord[0]}`).join(';');
            const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordsStr}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
            const mapboxResponse = await fetch(url);
            if (!mapboxResponse.ok) throw new Error(`Mapbox HTTP ${mapboxResponse.status}`);
            const data = await mapboxResponse.json();
            if (data.routes && data.routes.length > 0) {
                return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            }
            return null;
        } catch (error) {
            console.warn('Mapbox Directions failed:', error);
            return null;
        }
    }

    
    async tryORS(coordinates, options = {}) {
        try {
            
            const ORS_API_KEY = window.ORS_API_KEY;
            if (!ORS_API_KEY) throw new Error('ORS API key not set. Please set window.ORS_API_KEY in config.js');
            const profile = options.profile || 'foot-walking';
            
            const geojson = {
                coordinates: coordinates.map(c => [c[1], c[0]]),
                format: 'geojson'
            };
            const orsResponse = await fetch(
                `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': ORS_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(geojson)
                }
            );
            if (!orsResponse.ok) throw new Error(`ORS HTTP ${orsResponse.status}`);
            const data = await orsResponse.json();
            if (data && data.features && data.features.length > 0) {
                return data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            }
            return null;
        } catch (error) {
            console.warn('ORS failed:', error);
            return null;
        }
    }
}


window.RouteSnappingService = new RouteSnappingService();


window.RouteSnapping = {
  snapRoute: async function(coords, mode) {
    if (!window._routeSnappingService) {
      window._routeSnappingService = new RouteSnappingService();
    }
    return window._routeSnappingService.snapToRoads(coords, { profile: mode });
  }
}; 