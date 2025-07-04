

class Utils {
    
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; 
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    
    static deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    
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

    
    static rad2deg(rad) {
        return rad * (180/Math.PI);
    }

    
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

    
    static formatDistance(distance) {
        if (distance < 1) {
            return `${(distance * 1000).toFixed(0)} m`;
        } else {
            return `${distance.toFixed(2)} km`;
        }
    }

    
    static formatElevation(elevation) {
        return `${elevation.toFixed(0)} m`;
    }

    
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    
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

    
    static showLoading(message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const messageEl = document.getElementById('loadingMessage');
        if (overlay && messageEl) {
            messageEl.textContent = message;
            overlay.classList.remove('hidden');
        }
    }

    
    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    
    static updateStatus(message) {
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    
    static updateCoordinates(lat, lng) {
        const coordsEl = document.getElementById('coordinates');
        if (coordsEl) {
            coordsEl.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        }
    }

    
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

    
    static isValidCoordinates(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    
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

    
    static interpolate(start, end, factor) {
        return start + (end - start) * factor;
    }

    
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


window.Utils = Utils; 