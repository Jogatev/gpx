/**
 * Route Snapping Service
 * Aligns drawn routes to real-world roads using mapping APIs
 */

class RouteSnappingService {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 500;
    }

    /**
     * Snap route coordinates to roads
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {Object} options - Snapping options
     * @returns {Promise<Array>} Snapped coordinates
     */
    async snapToRoads(coordinates, options = {}) {
        if (!coordinates || coordinates.length < 2) {
            return coordinates;
        }

        let {
            profile = 'driving',
            simplify = true,
            maxPoints = 100
        } = options;

        // Always use walking profile if requested
        if (options.profile === 'walking') {
            profile = 'walking';
        }

        // Limit waypoints for Mapbox/OSRM/ORS to 10 (start, end, and evenly spaced intermediates)
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

        // Check cache first
        const cacheKey = this.generateCacheKey(snappedInputCoords, { ...options, profile });
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            Utils.showLoading('Snapping route to roads...');
            let snappedCoords = null;
            // Try ORS first for walking
            if (profile === 'walking') {
                snappedCoords = await this.tryORS(snappedInputCoords, { ...options, profile });
            }
            // Fallback to Mapbox Directions
            if (!snappedCoords || snappedCoords.length === 0) {
                snappedCoords = await this.tryMapbox(snappedInputCoords, { ...options, profile });
            }
            // Fallback to OSRM
            if (!snappedCoords || snappedCoords.length === 0) {
                snappedCoords = await this.tryOSRM(snappedInputCoords, { ...options, profile });
            }
            if (!snappedCoords || snappedCoords.length === 0) {
                snappedCoords = await this.tryGraphHopper(snappedInputCoords, { ...options, profile });
            }
            if (!snappedCoords || snappedCoords.length === 0) {
                // For walking, use optimizeForWalking for a more realistic fallback
                if (profile === 'walking') {
                    snappedCoords = this.optimizeForWalking(coordinates);
                } else {
                    snappedCoords = await this.simulateRoadSnapping(coordinates, { ...options, profile });
            }
            }
            // Simplify route if requested
            if (simplify && snappedCoords.length > maxPoints) {
                snappedCoords = this.simplifyRoute(snappedCoords, maxPoints);
            }
            // Cache the result
            this.cacheResult(cacheKey, snappedCoords);
            Utils.hideLoading();
            return snappedCoords;
        } catch (error) {
            console.error('Error snapping route to roads:', error);
            Utils.hideLoading();
            // For walking, use optimizeForWalking for a more realistic fallback
            if (profile === 'walking') {
                return this.optimizeForWalking(coordinates);
            }
            // Fallback to simulated snapping
            return this.simulateRoadSnapping(coordinates, { ...options, profile });
        }
    }

    /**
     * Try to snap route using OSRM (Open Source Routing Machine)
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {Object} options - Snapping options
     * @returns {Promise<Array>} Snapped coordinates
     */
    async tryOSRM(coordinates, options = {}) {
        try {
            const { profile = 'driving' } = options;
            
            // Convert coordinates to OSRM format (lng,lat)
            const coords = coordinates.map(coord => `${coord[1]},${coord[0]}`).join(';');
            
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true`
            );
            
            if (!response.ok) {
                throw new Error(`OSRM HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                if (route.geometry && route.geometry.coordinates) {
                    // Convert back to [lat, lng] format
                    return route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                }
            }
            
            return null;
            
        } catch (error) {
            console.warn('OSRM failed:', error);
            return null;
        }
    }

    /**
     * Try to snap route using GraphHopper (requires API key)
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {Object} options - Snapping options
     * @returns {Promise<Array>} Snapped coordinates
     */
    async tryGraphHopper(coordinates, options = {}) {
        try {
            // This would require a GraphHopper API key
            // For demo purposes, we'll return null
            // In a real implementation, you would use:
            /*
            const API_KEY = 'your_graphhopper_api_key';
            const { profile = 'car' } = options;
            
            const points = coordinates.map(coord => `${coord[0]},${coord[1]}`).join('|');
            const response = await fetch(
                `https://graphhopper.com/api/1/route?point=${points}&vehicle=${profile}&key=${API_KEY}&instructions=false&calc_points=true&points_encoded=false`
            );
            
            const data = await response.json();
            if (data.paths && data.paths.length > 0) {
                return data.paths[0].points.coordinates.map(coord => [coord[1], coord[0]]);
            }
            */
            
            return null;
            
        } catch (error) {
            console.warn('GraphHopper failed:', error);
            return null;
        }
    }

    /**
     * Simulate road snapping by smoothing and aligning to grid-like patterns
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {Object} options - Snapping options
     * @returns {Array} Simulated snapped coordinates
     */
    simulateRoadSnapping(coordinates, options = {}) {
        if (coordinates.length < 2) return coordinates;
        
        const { profile = 'driving', gridSize = 0.001 } = options;
        
        // Create a more realistic road-like path
        const snappedCoords = [];
        
        for (let i = 0; i < coordinates.length; i++) {
            const [lat, lng] = coordinates[i];
            
            // Snap to a grid-like pattern to simulate road alignment
            const snappedLat = Math.round(lat / gridSize) * gridSize;
            const snappedLng = Math.round(lng / gridSize) * gridSize;
            
            // Add some variation based on profile
            let variation = 0;
            if (profile === 'walking') {
                variation = (Math.random() - 0.5) * gridSize * 0.5; // More variation for walking
            } else if (profile === 'cycling') {
                variation = (Math.random() - 0.5) * gridSize * 0.3; // Medium variation for cycling
            } else {
                variation = (Math.random() - 0.5) * gridSize * 0.1; // Less variation for driving
            }
            
            snappedCoords.push([snappedLat + variation, snappedLng + variation]);
        }
        
        // Smooth the route to make it more realistic
        return this.smoothRoute(snappedCoords);
    }

    /**
     * Smooth route coordinates to create more realistic paths
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @returns {Array} Smoothed coordinates
     */
    smoothRoute(coordinates) {
        if (coordinates.length < 3) return coordinates;
        
        const smoothed = [coordinates[0]]; // Keep first point
        
        for (let i = 1; i < coordinates.length - 1; i++) {
            const prev = coordinates[i - 1];
            const curr = coordinates[i];
            const next = coordinates[i + 1];
            
            // Calculate weighted average
            const weight = 0.3;
            const smoothedLat = curr[0] * (1 - 2 * weight) + prev[0] * weight + next[0] * weight;
            const smoothedLng = curr[1] * (1 - 2 * weight) + prev[1] * weight + next[1] * weight;
            
            smoothed.push([smoothedLat, smoothedLng]);
        }
        
        smoothed.push(coordinates[coordinates.length - 1]); // Keep last point
        return smoothed;
    }

    /**
     * Simplify route by removing unnecessary points
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {number} maxPoints - Maximum number of points
     * @returns {Array} Simplified coordinates
     */
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

    /**
     * Add intermediate points to create smoother curves
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {number} pointsPerSegment - Number of points to add per segment
     * @returns {Array} Interpolated coordinates
     */
    interpolateRoute(coordinates, pointsPerSegment = 3) {
        if (coordinates.length < 2) return coordinates;
        
        const interpolated = [];
        
        for (let i = 0; i < coordinates.length - 1; i++) {
            const start = coordinates[i];
            const end = coordinates[i + 1];
            
            interpolated.push(start);
            
            // Add intermediate points
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

    /**
     * Optimize route for specific transportation mode
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {string} mode - Transportation mode
     * @returns {Array} Optimized coordinates
     */
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

    /**
     * Optimize route for walking (more direct paths, less grid-like)
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @returns {Array} Optimized coordinates
     */
    optimizeForWalking(coordinates) {
        // Walking routes can be more direct and less constrained
        return this.smoothRoute(coordinates);
    }

    /**
     * Optimize route for cycling (avoid steep hills, prefer bike paths)
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @returns {Array} Optimized coordinates
     */
    optimizeForCycling(coordinates) {
        // Cycling routes should avoid steep gradients
        const optimized = [];
        
        for (let i = 0; i < coordinates.length; i++) {
            const coord = coordinates[i];
            
            // Add slight variations to simulate bike path routing
            const variation = (Math.random() - 0.5) * 0.0001;
            optimized.push([coord[0] + variation, coord[1] + variation]);
        }
        
        return this.smoothRoute(optimized);
    }

    /**
     * Optimize route for driving (follow roads more strictly)
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @returns {Array} Optimized coordinates
     */
    optimizeForDriving(coordinates) {
        // Driving routes should follow road patterns more strictly
        return this.simulateRoadSnapping(coordinates, { profile: 'driving' });
    }

    /**
     * Generate cache key for coordinates and options
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {Object} options - Snapping options
     * @returns {string} Cache key
     */
    generateCacheKey(coordinates, options) {
        if (coordinates.length === 0) return '';
        
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        const middle = coordinates[Math.floor(coordinates.length / 2)];
        
        const optionsStr = JSON.stringify(options);
        return `${first[0].toFixed(4)},${first[1].toFixed(4)}-${middle[0].toFixed(4)},${middle[1].toFixed(4)}-${last[0].toFixed(4)},${last[1].toFixed(4)}-${optionsStr}`;
    }

    /**
     * Cache snapped route result
     * @param {string} key - Cache key
     * @param {Array} coordinates - Snapped coordinates
     */
    cacheResult(key, coordinates) {
        // Implement simple LRU cache
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, coordinates);
    }

    /**
     * Clear route snapping cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
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
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Mapbox HTTP ${response.status}`);
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            }
            return null;
        } catch (error) {
            console.warn('Mapbox Directions failed:', error);
            return null;
        }
    }

    /**
     * Try to snap route using OpenRouteService (ORS)
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {Object} options - Snapping options
     * @returns {Promise<Array>} Snapped coordinates
     */
    async tryORS(coordinates, options = {}) {
        try {
            // Set your ORS API key in config.js as: window.ORS_API_KEY = 'YOUR_KEY_HERE';
            const ORS_API_KEY = window.ORS_API_KEY;
            if (!ORS_API_KEY) throw new Error('ORS API key not set. Please set window.ORS_API_KEY in config.js');
            const profile = options.profile || 'foot-walking';
            // ORS expects GeoJSON LineString coordinates [lng, lat]
            const geojson = {
                coordinates: coordinates.map(c => [c[1], c[0]]),
                format: 'geojson'
            };
            const response = await fetch(
                `https://api.openrouteservice.org/v2/directions/foot-walking/geojson`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': ORS_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(geojson)
                }
            );
            if (!response.ok) throw new Error(`ORS HTTP ${response.status}`);
            const data = await response.json();
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

// Create global instance
window.RouteSnappingService = new RouteSnappingService(); 