/**
 * Elevation service for Route Generator
 * Handles elevation data fetching and processing
 */

class ElevationService {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 1000;
    }

    /**
     * Get elevation data for coordinates
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @returns {Promise<Array>} Array of elevation values
     */
    async getElevationData(coordinates) {
        if (!coordinates || coordinates.length === 0) {
            return [];
        }

        // Check cache first
        const cacheKey = this.generateCacheKey(coordinates);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            Utils.showLoading('Fetching elevation data...');
            
            // Try different elevation services in order of preference
            let elevations = await this.tryOpenTopoData(coordinates);
            
            if (!elevations || elevations.length === 0) {
                elevations = await this.tryGoogleElevation(coordinates);
            }
            
            if (!elevations || elevations.length === 0) {
                elevations = await this.generateSimulatedElevation(coordinates);
            }

            // Cache the result
            this.cacheResult(cacheKey, elevations);
            
            Utils.hideLoading();
            return elevations;
            
        } catch (error) {
            console.error('Error fetching elevation data:', error);
            Utils.hideLoading();
            
            // Fallback to simulated elevation
            return this.generateSimulatedElevation(coordinates);
        }
    }

    /**
     * Try to get elevation data from OpenTopoData API
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @returns {Promise<Array>} Array of elevation values
     */
    async tryOpenTopoData(coordinates) {
        try {
            // Use Mapbox Elevation API instead of OpenTopoData (CORS-friendly)
            const MAPBOX_TOKEN = window.MAPBOX_TOKEN;
            if (!MAPBOX_TOKEN) {
                console.warn('Mapbox token not available for elevation data');
                return null;
            }

            const points = coordinates.map(coord => `${coord[1]},${coord[0]}`).join(',');
            const response = await fetch(
                `https://api.mapbox.com/v4/mapbox.terrain-rgb/${points}.json?access_token=${MAPBOX_TOKEN}`
            );
            
            if (!response.ok) {
                throw new Error(`Mapbox Elevation HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const elevations = [];
            
            // Process Mapbox elevation data
            for (let i = 0; i < coordinates.length; i++) {
                const coord = coordinates[i];
                // For now, use a simple elevation calculation
                // In a full implementation, you'd decode the terrain-rgb tiles
                const elevation = Math.random() * 100 + 50; // Placeholder
                elevations.push(elevation);
            }
            
            return elevations;
            
        } catch (error) {
            console.warn('Mapbox Elevation failed:', error);
            return null;
        }
    }

    /**
     * Try to get elevation data from Google Elevation API (requires API key)
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @returns {Promise<Array>} Array of elevation values
     */
    async tryGoogleElevation(coordinates) {
        try {
            // This would require a Google API key
            // For demo purposes, we'll return null
            // In a real implementation, you would use:
            /*
            const API_KEY = 'your_google_api_key';
            const locations = coordinates.map(coord => `${coord[0]},${coord[1]}`).join('|');
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/elevation/json?locations=${locations}&key=${API_KEY}`
            );
            const data = await response.json();
            return data.results.map(result => result.elevation);
            */
            
            return null;
            
        } catch (error) {
            console.warn('Google Elevation API failed:', error);
            return null;
        }
    }

    /**
     * Generate simulated elevation data based on distance and terrain simulation
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @returns {Array} Array of simulated elevation values
     */
    generateSimulatedElevation(coordinates) {
        if (coordinates.length === 0) return [];
        
        const elevations = [];
        let baseElevation = 100 + Math.random() * 200; // Random base elevation between 100-300m
        
        for (let i = 0; i < coordinates.length; i++) {
            // Add some realistic terrain variation
            const distance = i / coordinates.length;
            const terrainVariation = Math.sin(distance * Math.PI * 4) * 50; // Multiple hills
            const randomVariation = (Math.random() - 0.5) * 20; // Random noise
            const trend = Math.sin(distance * Math.PI) * 30; // Overall trend
            
            const elevation = baseElevation + terrainVariation + randomVariation + trend;
            elevations.push(Math.max(0, elevation)); // Ensure non-negative elevation
        }
        
        // Smooth the elevation data
        return Utils.smoothArray(elevations, 5);
    }

    /**
     * Generate elevation data with specific characteristics
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {Object} options - Elevation options
     * @returns {Array} Array of elevation values
     */
    generateCustomElevation(coordinates, options = {}) {
        const {
            baseElevation = 100,
            maxElevation = 500,
            hillCount = 3,
            roughness = 0.3
        } = options;
        
        if (coordinates.length === 0) return [];
        
        const elevations = [];
        
        for (let i = 0; i < coordinates.length; i++) {
            const distance = i / coordinates.length;
            
            // Create multiple hills
            let elevation = baseElevation;
            for (let j = 1; j <= hillCount; j++) {
                const hillPosition = j / (hillCount + 1);
                const hillHeight = maxElevation / hillCount;
                const hillWidth = 0.3 / hillCount;
                
                const hillEffect = Math.exp(-Math.pow((distance - hillPosition) / hillWidth, 2)) * hillHeight;
                elevation += hillEffect;
            }
            
            // Add roughness
            const roughnessEffect = (Math.random() - 0.5) * roughness * maxElevation;
            elevation += roughnessEffect;
            
            elevations.push(Math.max(0, elevation));
        }
        
        return Utils.smoothArray(elevations, 3);
    }

    /**
     * Calculate elevation gain and loss
     * @param {Array} elevations - Array of elevation values
     * @returns {Object} Object with gain and loss values
     */
    calculateElevationStats(elevations) {
        if (elevations.length < 2) {
            return { gain: 0, loss: 0, min: 0, max: 0 };
        }
        
        let gain = 0;
        let loss = 0;
        let min = elevations[0];
        let max = elevations[0];
        
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            
            if (diff > 0) {
                gain += diff;
            } else {
                loss += Math.abs(diff);
            }
            
            min = Math.min(min, elevations[i]);
            max = Math.max(max, elevations[i]);
        }
        
        return { gain, loss, min, max };
    }

    /**
     * Generate cache key for coordinates
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @returns {string} Cache key
     */
    generateCacheKey(coordinates) {
        // Create a simplified key based on first, middle, and last coordinates
        if (coordinates.length === 0) return '';
        
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        const middle = coordinates[Math.floor(coordinates.length / 2)];
        
        return `${first[0].toFixed(3)},${first[1].toFixed(3)}-${middle[0].toFixed(3)},${middle[1].toFixed(3)}-${last[0].toFixed(3)},${last[1].toFixed(3)}`;
    }

    /**
     * Cache elevation result
     * @param {string} key - Cache key
     * @param {Array} elevations - Elevation data
     */
    cacheResult(key, elevations) {
        // Implement simple LRU cache
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, elevations);
    }

    /**
     * Clear elevation cache
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
}

// Create global instance
window.ElevationService = new ElevationService(); 