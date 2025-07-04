/**
 * GPX Route Generator - Main Application
 * Advanced running route creator with smart snapping and modern UI
 */

class GPXRouteGenerator {
    constructor() {
        this.map = null;
        this.drawnItems = null;
        this.currentRoute = [];
        this.snappedRoute = null;
        this.isDrawing = false;
        this.currentPolyline = null;
        this.mode = 'draw'; // 'draw', 'pan', 'measure'
        
        // Initialize the application
        this.init();
    }

    async init() {
        try {
            await this.initializeMap();
            this.setupEventListeners();
            this.setupUI();
            this.showToast('Application loaded successfully!', 'success');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showToast('Failed to initialize application', 'error');
        }
    }

    async initializeMap() {
        // Initialize map with Mapbox tiles
        this.map = L.map('map', {
            center: [37.7749, -122.4194], // San Francisco
            zoom: 13,
            zoomControl: true,
            attributionControl: true
        });

        // Add Mapbox tiles
        L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token={accessToken}', {
            accessToken: window.MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
            maxZoom: 18,
            attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
        }).addTo(this.map);

        // Initialize drawn items layer
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);

        // Setup drawing events
        this.map.on('click', (e) => this.handleMapClick(e));
        this.map.on('mousemove', (e) => this.handleMouseMove(e));
    }

    setupEventListeners() {
        // Quick Actions
        document.getElementById('clearRoute').addEventListener('click', () => this.clearRoute());
        document.getElementById('undoLast').addEventListener('click', () => this.undoLastPoint());
        document.getElementById('fitToRoute').addEventListener('click', () => this.fitToRoute());

        // Template Actions
        document.getElementById('applyTemplate').addEventListener('click', () => this.applySelectedTemplate());

        // Loop Configuration
        document.getElementById('createLoop').addEventListener('click', () => this.createLoop());

        // Snapping Options
        document.getElementById('snapRoute').addEventListener('click', () => this.snapRoute());
        document.getElementById('autoSnap').addEventListener('change', (e) => {
            this.autoSnap = e.target.checked;
        });

        // Export Options
        document.getElementById('exportGPX').addEventListener('click', () => this.exportGPX());
        document.getElementById('exportKML').addEventListener('click', () => this.exportKML());
        document.getElementById('exportJSON').addEventListener('click', () => this.exportJSON());

        // Map Controls
        document.getElementById('drawMode').addEventListener('click', () => this.setMode('draw'));
        document.getElementById('panMode').addEventListener('click', () => this.setMode('pan'));
        document.getElementById('measureMode').addEventListener('click', () => this.setMode('measure'));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    setupUI() {
        // Set default values
        document.getElementById('runDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('runStartTime').value = new Date().toTimeString().slice(0, 5);
        
        // Initialize auto-snap
        this.autoSnap = document.getElementById('autoSnap').checked;
        
        // Update status
        this.updateStatus('Ready to draw your route');
    }

    handleMapClick(e) {
        if (this.mode !== 'draw') return;

        const latlng = e.latlng;
        this.addPoint(latlng);

        if (this.autoSnap && this.currentRoute.length > 1) {
            this.snapRoute();
        }
    }

    handleMouseMove(e) {
        const latlng = e.latlng;
        document.getElementById('coordinates').textContent = 
            `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
    }

    addPoint(latlng) {
        this.currentRoute.push([latlng.lat, latlng.lng]);
        
        // Update polyline
        if (this.currentPolyline) {
            this.map.removeLayer(this.currentPolyline);
        }
        
        this.currentPolyline = L.polyline(this.currentRoute, {
            color: '#e67e22',
            weight: 5,
            opacity: 0.8
        }).addTo(this.map);

        this.updateStats();
        this.updateStatus(`Added point ${this.currentRoute.length}`);
    }

    clearRoute() {
        this.currentRoute = [];
        this.snappedRoute = null;
        
        if (this.currentPolyline) {
            this.map.removeLayer(this.currentPolyline);
            this.currentPolyline = null;
        }
        
        this.drawnItems.clearLayers();
        this.updateStats();
        this.updateStatus('Route cleared');
        this.showToast('Route cleared', 'success');
    }

    undoLastPoint() {
        if (this.currentRoute.length > 0) {
            this.currentRoute.pop();
            
            if (this.currentPolyline) {
                this.map.removeLayer(this.currentPolyline);
            }
            
            if (this.currentRoute.length > 0) {
                this.currentPolyline = L.polyline(this.currentRoute, {
                    color: '#e67e22',
                    weight: 5,
                    opacity: 0.8
                }).addTo(this.map);
            } else {
                this.currentPolyline = null;
            }
            
            this.updateStats();
            this.updateStatus(`Removed last point. ${this.currentRoute.length} points remaining`);
        }
    }

    fitToRoute() {
        if (this.currentRoute.length > 0) {
            const bounds = L.latLngBounds(this.currentRoute);
            this.map.fitBounds(bounds, { padding: [20, 20] });
            this.updateStatus('Map fitted to route');
        }
    }

    async applySelectedTemplate() {
        const templateSelect = document.getElementById('templateSelect');
        const templateName = templateSelect.value;
        
        if (!templateName) {
            this.showToast('Please select a template', 'warning');
            return;
        }

        try {
            this.showLoading('Applying template...');
            const template = await window.RouteTemplates.applyTemplate(templateName, this.map);
            
            // Set the current route to template coordinates
            this.currentRoute = template.coordinates;
            
            // Draw the route
            if (this.currentPolyline) {
                this.map.removeLayer(this.currentPolyline);
            }
            
            this.currentPolyline = L.polyline(this.currentRoute, {
                color: '#e67e22',
                weight: 5,
                opacity: 0.8
            }).addTo(this.map);

            this.updateStats();
            this.updateStatus(`Applied template: ${template.name}`);
            this.showToast(`Template "${template.name}" applied successfully!`, 'success');
            
        } catch (error) {
            console.error('Failed to apply template:', error);
            this.showToast('Failed to apply template', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async createLoop() {
        if (this.currentRoute.length < 2) {
            this.showToast('Please draw a route first', 'warning');
            return;
        }

        try {
            this.showLoading('Creating loop...');
            
            const loopType = document.getElementById('loopType').value;
            const numLoops = parseInt(document.getElementById('numLoops').value);
            const gapDistance = parseInt(document.getElementById('gapDistance').value);
            
            const loopedRoute = window.RouteTemplates.generateLoopRoute(
                this.currentRoute, 
                loopType, 
                { numLoops, gapDistance }
            );
            
            // Update the current route
            this.currentRoute = loopedRoute;
            
            // Update the polyline
            if (this.currentPolyline) {
                this.map.removeLayer(this.currentPolyline);
            }
            
            this.currentPolyline = L.polyline(this.currentRoute, {
                color: '#e67e22',
                weight: 5,
                opacity: 0.8
            }).addTo(this.map);
            
            this.updateStats();
            this.updateStatus(`Created ${loopType} loop with ${numLoops} repetitions`);
            this.showToast('Loop created successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to create loop:', error);
            this.showToast('Failed to create loop', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async snapRoute() {
        if (this.currentRoute.length < 2) {
            this.showToast('Please draw a route first', 'warning');
            return;
        }

        try {
            this.showLoading('Snapping route to roads...');
            
            const snapMode = document.getElementById('snapMode').value;
            const snappedCoordinates = await window.RouteSnapping.snapRoute(
                this.currentRoute, 
                snapMode
            );
            
            if (snappedCoordinates && snappedCoordinates.length > 0) {
                this.snappedRoute = snappedCoordinates;
                
                // Clear existing snapped route
                this.drawnItems.clearLayers();
                
                // Draw snapped route
                const snappedPolyline = L.polyline(snappedCoordinates, {
                    color: '#27ae60',
                    weight: 6,
                    opacity: 0.9
                }).addTo(this.drawnItems);
                
                // Add markers for start and end points
                const startMarker = L.marker(snappedCoordinates[0], {
                    icon: L.divIcon({
                        className: 'start-marker',
                        html: '<div style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">START</div>'
                    })
                }).addTo(this.drawnItems);
                
                const endMarker = L.marker(snappedCoordinates[snappedCoordinates.length - 1], {
                    icon: L.divIcon({
                        className: 'end-marker',
                        html: '<div style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">END</div>'
                    })
                }).addTo(this.drawnItems);
                
                this.updateStats();
                this.updateStatus('Route snapped to roads successfully');
                this.showToast('Route snapped to roads!', 'success');
                
            } else {
                this.showToast('Failed to snap route', 'error');
            }
            
        } catch (error) {
            console.error('Failed to snap route:', error);
            this.showToast('Failed to snap route to roads', 'error');
        } finally {
            this.hideLoading();
        }
    }

    setMode(mode) {
        this.mode = mode;
        
        // Update UI
        document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${mode}Mode`).classList.add('active');
        
        // Update map behavior
        if (mode === 'pan') {
            this.map.dragging.enable();
            this.map.doubleClickZoom.enable();
        } else if (mode === 'draw') {
            this.map.dragging.enable();
            this.map.doubleClickZoom.enable();
        } else if (mode === 'measure') {
            this.map.dragging.enable();
            this.map.doubleClickZoom.enable();
        }
        
        this.updateStatus(`Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    }

    handleKeyboard(e) {
        switch (e.key) {
            case 'Escape':
                this.clearRoute();
                break;
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.undoLastPoint();
                }
                break;
            case 'f':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.fitToRoute();
                }
                break;
        }
    }

    updateStats() {
        const routeToUse = this.snappedRoute || this.currentRoute;
        
        if (routeToUse.length < 2) {
            document.getElementById('distance').textContent = '0.0 km';
            document.getElementById('duration').textContent = '0:00';
            document.getElementById('elevation').textContent = '0 m';
            document.getElementById('pace').textContent = '--';
            return;
        }
        
        // Calculate distance
        let totalDistance = 0;
        for (let i = 1; i < routeToUse.length; i++) {
            const prev = routeToUse[i - 1];
            const curr = routeToUse[i];
            totalDistance += this.calculateDistance(prev, curr);
        }
        
        // Calculate duration (assuming 5:30 min/km pace)
        const paceMinutes = 5.5;
        const durationMinutes = totalDistance * paceMinutes;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = Math.floor(durationMinutes % 60);
        
        // Calculate elevation (placeholder)
        const elevation = Math.floor(totalDistance * 50); // Rough estimate
        
        // Update UI
        document.getElementById('distance').textContent = `${totalDistance.toFixed(1)} km`;
        document.getElementById('duration').textContent = `${hours}:${minutes.toString().padStart(2, '0')}`;
        document.getElementById('elevation').textContent = `${elevation} m`;
        document.getElementById('pace').textContent = `${paceMinutes}:00`;
    }

    calculateDistance(point1, point2) {
        const R = 6371; // Earth's radius in km
        const dLat = (point2[0] - point1[0]) * Math.PI / 180;
        const dLon = (point2[1] - point1[1]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    updateStatus(message) {
        document.getElementById('statusMessage').textContent = message;
    }

    showLoading(message) {
        document.getElementById('loadingMessage').textContent = message;
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    async exportGPX() {
        if (!this.snappedRoute && this.currentRoute.length < 2) {
            this.showToast('Please draw and snap a route first', 'warning');
            return;
        }

        try {
            const routeToUse = this.snappedRoute || this.currentRoute;
            const gpxContent = await window.GPXExport.generateGPX(routeToUse);
            this.downloadFile(gpxContent, 'route.gpx', 'application/gpx+xml');
            this.showToast('GPX file exported successfully!', 'success');
        } catch (error) {
            console.error('Failed to export GPX:', error);
            this.showToast('Failed to export GPX file', 'error');
        }
    }

    async exportKML() {
        if (!this.snappedRoute && this.currentRoute.length < 2) {
            this.showToast('Please draw and snap a route first', 'warning');
            return;
        }

        try {
            const routeToUse = this.snappedRoute || this.currentRoute;
            const kmlContent = await window.GPXExport.generateKML(routeToUse);
            this.downloadFile(kmlContent, 'route.kml', 'application/vnd.google-earth.kml+xml');
            this.showToast('KML file exported successfully!', 'success');
        } catch (error) {
            console.error('Failed to export KML:', error);
            this.showToast('Failed to export KML file', 'error');
        }
    }

    async exportJSON() {
        if (!this.snappedRoute && this.currentRoute.length < 2) {
            this.showToast('Please draw and snap a route first', 'warning');
            return;
        }

        try {
            const routeToUse = this.snappedRoute || this.currentRoute;
            const jsonContent = JSON.stringify({
                route: routeToUse,
                metadata: {
                    distance: document.getElementById('distance').textContent,
                    duration: document.getElementById('duration').textContent,
                    elevation: document.getElementById('elevation').textContent,
                    exportDate: new Date().toISOString()
                }
            }, null, 2);
            
            this.downloadFile(jsonContent, 'route.json', 'application/json');
            this.showToast('JSON file exported successfully!', 'success');
        } catch (error) {
            console.error('Failed to export JSON:', error);
            this.showToast('Failed to export JSON file', 'error');
        }
    }

    downloadFile(content, filename, mimeType) {
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
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.routeGenerator = new GPXRouteGenerator();
}); 