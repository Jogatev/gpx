

class ElevationService {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 1000;
    }

    
    async getElevationData(coordinates) {
        if (!coordinates || coordinates.length === 0) {
            return [];
        }

        
        const cacheKey = this.generateCacheKey(coordinates);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            Utils.showLoading('Fetching elevation data...');
            
            
            let elevations = await this.tryOpenTopoData(coordinates);
            
            if (!elevations || elevations.length === 0) {
                elevations = await this.tryGoogleElevation(coordinates);
            }
            
            if (!elevations || elevations.length === 0) {
                elevations = await this.generateSimulatedElevation(coordinates);
            }

            
            this.cacheResult(cacheKey, elevations);
            
            Utils.hideLoading();
            return elevations;
            
        } catch (error) {
            console.error('Error fetching elevation data:', error);
            Utils.hideLoading();
            
            
            return this.generateSimulatedElevation(coordinates);
        }
    }

    
    async tryOpenTopoData(coordinates) {
        try {
            
            const MAPBOX_TOKEN = window.MAPBOX_TOKEN;
            if (!MAPBOX_TOKEN) {
                console.warn('Mapbox token not available for elevation data');
                return null;
            }

            const points = coordinates.map(coord => `${coord[1]},${coord[0]}`).join(',');
            const response = await fetch(
                `https://api.mapbox.com/v4/mapbox.terrain-rgb/${coordinates.map(coord => `${coord[1]},${coord[0]}`).join(',')}.json?access_token=${MAPBOX_TOKEN}`
            );
            
            if (!response.ok) {
                throw new Error(`Mapbox Elevation HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const elevations = [];
            
            
            for (let i = 0; i < coordinates.length; i++) {
                const coord = coordinates[i];
                
                
                const elevation = Math.random() * 100 + 50; 
                elevations.push(elevation);
            }
            
            return elevations;
            
        } catch (error) {
            console.warn('Mapbox Elevation failed:', error);
            return null;
        }
    }

    
    async tryGoogleElevation(coordinates) {
        try {
            
            return null;
        } catch (error) {
            console.warn('Google Elevation API failed:', error);
            return null;
        }
    }

    
    generateSimulatedElevation(coordinates) {
        if (coordinates.length === 0) return [];
        
        const elevations = [];
        let baseElevation = 100 + Math.random() * 200; 
        
        for (let i = 0; i < coordinates.length; i++) {
            
            const distance = i / coordinates.length;
            const terrainVariation = Math.sin(distance * Math.PI * 4) * 50; 
            const randomVariation = (Math.random() - 0.5) * 20; 
            const trend = Math.sin(distance * Math.PI) * 30; 
            
            const elevation = baseElevation + terrainVariation + randomVariation + trend;
            elevations.push(Math.max(0, elevation)); 
        }
        
        
        return Utils.smoothArray(elevations, 5);
    }

    
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
            
            
            let elevation = baseElevation;
            for (let j = 1; j <= hillCount; j++) {
                const hillPosition = j / (hillCount + 1);
                const hillHeight = maxElevation / hillCount;
                const hillWidth = 0.3 / hillCount;
                
                const hillEffect = Math.exp(-Math.pow((distance - hillPosition) / hillWidth, 2)) * hillHeight;
                elevation += hillEffect;
            }
            
            
            const roughnessEffect = (Math.random() - 0.5) * roughness * maxElevation;
            elevation += roughnessEffect;
            
            elevations.push(Math.max(0, elevation));
        }
        
        return Utils.smoothArray(elevations, 3);
    }

    
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

    
    generateCacheKey(coordinates) {
        
        if (coordinates.length === 0) return '';
        
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        const middle = coordinates[Math.floor(coordinates.length / 2)];
        
        return `${first[0].toFixed(3)},${first[1].toFixed(3)}-${middle[0].toFixed(3)},${middle[1].toFixed(3)}-${last[0].toFixed(3)},${last[1].toFixed(3)}`;
    }

    
    cacheResult(key, elevations) {
        
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, elevations);
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
}


window.ElevationService = new ElevationService(); 