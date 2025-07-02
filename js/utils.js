/**
 * Utility functions for Route Generator
 */

class Utils {
    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} Distance in kilometers
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     * @param {number} deg - Degrees
     * @returns {number} Radians
     */
    static deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    /**
     * Calculate total distance of a route
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @returns {number} Total distance in kilometers
     */
    static calculateRouteDistance(coordinates) {
        if (coordinates.length < 2) return 0;
        
        let totalDistance = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
            const [lat1, lng1] = coordinates[i];
            const [lat2, lng2] = coordinates[i + 1];
            totalDistance += this.calculateDistance(lat1, lng1, lat2, lng2);
        }
        return totalDistance;
    }

    /**
     * Calculate bearing between two points
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} Bearing in degrees
     */
    static calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = this.deg2rad(lon2 - lon1);
        const lat1Rad = this.deg2rad(lat1);
        const lat2Rad = this.deg2rad(lat2);
        
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        
        let bearing = this.rad2deg(Math.atan2(y, x));
        return (bearing + 360) % 360;
    }

    /**
     * Convert radians to degrees
     * @param {number} rad - Radians
     * @returns {number} Degrees
     */
    static rad2deg(rad) {
        return rad * (180/Math.PI);
    }

    /**
     * Format time duration from seconds
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted time string (HH:MM:SS)
     */
    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Format distance with appropriate units
     * @param {number} distance - Distance in kilometers
     * @returns {string} Formatted distance string
     */
    static formatDistance(distance) {
        if (distance < 1) {
            return `${(distance * 1000).toFixed(0)} m`;
        } else {
            return `${distance.toFixed(2)} km`;
        }
    }

    /**
     * Format elevation with appropriate units
     * @param {number} elevation - Elevation in meters
     * @returns {string} Formatted elevation string
     */
    static formatElevation(elevation) {
        return `${elevation.toFixed(0)} m`;
    }

    /**
     * Generate a unique ID
     * @returns {string} Unique ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Debounce function to limit function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function to limit function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Show loading overlay
     * @param {string} message - Loading message
     */
    static showLoading(message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const messageEl = document.getElementById('loadingMessage');
        if (overlay && messageEl) {
            messageEl.textContent = message;
            overlay.classList.remove('hidden');
        }
    }

    /**
     * Hide loading overlay
     */
    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Update status message
     * @param {string} message - Status message
     */
    static updateStatus(message) {
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    /**
     * Update coordinates display
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    static updateCoordinates(lat, lng) {
        const coordsEl = document.getElementById('coordinates');
        if (coordsEl) {
            coordsEl.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        }
    }

    /**
     * Download file with given content and filename
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Validate coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {boolean} True if valid coordinates
     */
    static isValidCoordinates(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    /**
     * Calculate elevation gain from elevation data
     * @param {Array} elevations - Array of elevation values
     * @returns {number} Total elevation gain in meters
     */
    static calculateElevationGain(elevations) {
        if (elevations.length < 2) return 0;
        
        let totalGain = 0;
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff > 0) {
                totalGain += diff;
            }
        }
        return totalGain;
    }

    /**
     * Interpolate between two values
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    static interpolate(start, end, factor) {
        return start + (end - start) * factor;
    }

    /**
     * Smooth array of values using moving average
     * @param {Array} values - Array of values to smooth
     * @param {number} windowSize - Window size for moving average
     * @returns {Array} Smoothed values
     */
    static smoothArray(values, windowSize = 3) {
        if (values.length < windowSize) return values;
        
        const smoothed = [];
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < values.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = Math.max(0, i - halfWindow); j <= Math.min(values.length - 1, i + halfWindow); j++) {
                sum += values[j];
                count++;
            }
            
            smoothed.push(sum / count);
        }
        
        return smoothed;
    }
}

// Export for use in other modules
window.Utils = Utils; 