class GPXRouteGenerator {
    constructor() {
        this.map = null;
        this.drawnItems = null;
        this.currentRoute = [];
        this.snappedRoute = null;
        this.isDrawing = false;
        this.currentPolyline = null;
        this.mode = 'draw'; 
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
        let center = [14.5547, 121.0244]; 
        let zoom = 13;
        if (navigator.geolocation) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
                });
                center = this.adjustUserLocation([pos.coords.latitude, pos.coords.longitude]);
                zoom = 15;
            } catch (e) {
                console.warn('Geolocation failed:', e);
            }
        }
        this.map = L.map('map', {
            center,
            zoom,
            zoomControl: true,
            attributionControl: true
        });
        if (!window.MAPBOX_TOKEN) {
            console.error('Mapbox token is not set. Please set window.MAPBOX_TOKEN before loading the map.');
        }
        L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token={accessToken}', {
            accessToken: window.MAPBOX_TOKEN,
            maxZoom: 18,
            attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
        }).addTo(this.map);
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);
        this.map.on('click', (e) => this.handleMapClick(e));
        this.map.on('mousemove', (e) => this.handleMouseMove(e));
    }

    setupEventListeners() {
        const addEventListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        };

        addEventListener('clearRoute', 'click', () => this.clearRoute());
        addEventListener('undoLast', 'click', () => this.undoLastPoint());
        addEventListener('fitToRoute', 'click', () => this.fitToRoute());

        addEventListener('applyTemplate', 'click', () => this.applySelectedTemplate());

        addEventListener('createLoop', 'click', () => this.createLoop());
        
        ['numLoops', 'loopType', 'gapDistance'].forEach(id => {
            addEventListener(id, 'input', () => this.previewLapStats());
        });

        addEventListener('snapRoute', 'click', () => this.snapRoute());
        addEventListener('autoSnap', 'change', (e) => {
            this.autoSnap = e.target.checked;
        });

        addEventListener('exportGPX', 'click', () => this.exportGPX());
        addEventListener('exportKML', 'click', () => this.exportKML());
        addEventListener('exportJSON', 'click', () => this.exportJSON());

        addEventListener('drawMode', 'click', () => this.setMode('draw'));
        addEventListener('panMode', 'click', () => this.setMode('pan'));
        addEventListener('measureMode', 'click', () => this.setMode('measure'));
        addEventListener('centerToUser', 'click', () => this.centerToUserLocation());
        addEventListener('saveGPSSettings', 'click', () => this.saveGPSSettings());

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    setupUI() {
        const runDateElement = document.getElementById('runDate');
        const runStartTimeElement = document.getElementById('runStartTime');
        const autoSnapElement = document.getElementById('autoSnap');
        
        if (runDateElement) {
            runDateElement.value = new Date().toISOString().split('T')[0];
        }
        
        if (runStartTimeElement) {
            runStartTimeElement.value = new Date().toTimeString().slice(0, 5);
        }
        
        this.autoSnap = autoSnapElement ? autoSnapElement.checked : true;
        
        // Load saved GPS settings
        this.loadGPSSettings();
        
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
        const coordinatesElement = document.getElementById('coordinates');
        if (coordinatesElement) {
            coordinatesElement.textContent = 
                `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
        }
    }

    addPoint(latlng) {
        this.currentRoute.push([latlng.lat, latlng.lng]);
        
        if (this.currentPolyline) {
            this.map.removeLayer(this.currentPolyline);
        }
        
        this.currentPolyline = L.polyline(this.currentRoute, {
            color: '#e67e22',
            weight: 5,
            opacity: 0.8
        }).addTo(this.map);

        this.previewLapStats();
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
        this.previewLapStats();
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
            
            this.previewLapStats();
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

    adjustUserLocation(coordinates) {
        const latOffsetInput = document.getElementById('latOffset');
        const lngOffsetInput = document.getElementById('lngOffset');
        
        const latOffset = latOffsetInput ? parseFloat(latOffsetInput.value) || 0 : 0;
        const lngOffset = lngOffsetInput ? parseFloat(lngOffsetInput.value) || 0 : 0;
        
        return [
            coordinates[0] + latOffset,
            coordinates[1] + lngOffset
        ];
    }

    saveGPSSettings() {
        const latOffsetInput = document.getElementById('latOffset');
        const lngOffsetInput = document.getElementById('lngOffset');
        
        if (latOffsetInput && lngOffsetInput) {
            const latOffset = parseFloat(latOffsetInput.value) || 0;
            const lngOffset = parseFloat(lngOffsetInput.value) || 0;
            
            localStorage.setItem('gpsLatOffset', latOffset.toString());
            localStorage.setItem('gpsLngOffset', lngOffset.toString());
            
            this.showToast('GPS settings saved', 'success');
        }
    }

    loadGPSSettings() {
        const latOffsetInput = document.getElementById('latOffset');
        const lngOffsetInput = document.getElementById('lngOffset');
        
        if (latOffsetInput && lngOffsetInput) {
            const savedLatOffset = localStorage.getItem('gpsLatOffset');
            const savedLngOffset = localStorage.getItem('gpsLngOffset');
            
            if (savedLatOffset) latOffsetInput.value = savedLatOffset;
            if (savedLngOffset) lngOffsetInput.value = savedLngOffset;
        }
    }

    async centerToUserLocation() {
        if (!navigator.geolocation) {
            this.showToast('Geolocation not supported', 'error');
            return;
        }

        try {
            this.showLoading('Getting your location...');
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { 
                    enableHighAccuracy: true, 
                    timeout: 10000,
                    maximumAge: 30000
                });
            });
            
            const adjustedLocation = this.adjustUserLocation([pos.coords.latitude, pos.coords.longitude]);
            this.map.setView(adjustedLocation, 15);
            this.hideLoading();
            this.updateStatus('Centered to your location');
            this.showToast('Map centered to your location', 'success');
        } catch (error) {
            this.hideLoading();
            console.error('Error getting location:', error);
            this.showToast('Failed to get your location', 'error');
        }
    }

    async applySelectedTemplate() {
        const templateSelect = document.getElementById('templateSelect');
        if (!templateSelect) {
            this.showToast('Template selector not found', 'error');
            return;
        }
        
        const templateName = templateSelect.value;
        
        if (!templateName) {
            this.showToast('Please select a template', 'warning');
            return;
        }

        try {
            this.showLoading('Applying template...');
            const template = await window.RouteTemplates.applyTemplate(templateName, this.map);
            
            this.currentRoute = template.coordinates;
            
            if (this.currentPolyline) {
                this.map.removeLayer(this.currentPolyline);
            }
            
            this.currentPolyline = L.polyline(this.currentRoute, {
                color: '#e67e22',
                weight: 5,
                opacity: 0.8
            }).addTo(this.map);

            this.previewLapStats();
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
            
            const loopTypeElement = document.getElementById('loopType');
            const numLoopsElement = document.getElementById('numLoops');
            const gapDistanceElement = document.getElementById('gapDistance');
            
            if (!loopTypeElement || !numLoopsElement || !gapDistanceElement) {
                this.showToast('Loop configuration elements not found', 'error');
                return;
            }
            
            const loopType = loopTypeElement.value;
            const numLoops = parseInt(numLoopsElement.value);
            const gapDistance = parseInt(gapDistanceElement.value);
            
            const loopedRoute = window.RouteTemplates.generateLoopRoute(
                this.currentRoute, 
                loopType, 
                { numLoops, gapDistance }
            );
            
            this.currentRoute = loopedRoute;
            this.snappedRoute = null;
            
            if (this.currentPolyline) {
                this.map.removeLayer(this.currentPolyline);
            }
            
            this.currentPolyline = L.polyline(this.currentRoute, {
                color: '#e67e22',
                weight: 5,
                opacity: 0.8
            }).addTo(this.map);

            this.previewLapStats();
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
            
            const snapModeElement = document.getElementById('snapMode');
            if (!snapModeElement) {
                this.showToast('Snap mode selector not found', 'error');
            return;
        }
            
            const snapMode = snapModeElement.value;
            const snappedCoordinates = await window.RouteSnapping.snapRoute(
                this.currentRoute, 
                snapMode
            );
            
            if (snappedCoordinates && snappedCoordinates.length > 0) {
                this.snappedRoute = snappedCoordinates;
                
                this.drawnItems.clearLayers();
                
                const snappedPolyline = L.polyline(snappedCoordinates, {
                    color: '#27ae60',
                    weight: 6,
                    opacity: 0.9
                }).addTo(this.drawnItems);
                
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
                
                this.previewLapStats();
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
        
        document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
        const modeButton = document.getElementById(`${mode}Mode`);
        if (modeButton) {
            modeButton.classList.add('active');
        }
        
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

    updateStats(routeOverride) {
        const routeToUse = routeOverride || this.snappedRoute || this.currentRoute;
        
        console.log('[updateStats] Route length for stats:', routeToUse ? routeToUse.length : 0);
        
        if (!routeToUse || routeToUse.length < 2) {
            const distanceElement = document.getElementById('distance');
            const durationElement = document.getElementById('duration');
            const elevationElement = document.getElementById('elevation');
            const paceElement = document.getElementById('pace');
            
            if (distanceElement) distanceElement.textContent = '0.0 km';
            if (durationElement) durationElement.textContent = '0:00';
            if (elevationElement) elevationElement.textContent = '0 m';
            if (paceElement) paceElement.textContent = '--';
            return;
        }
        
        let totalDistance = 0;
        for (let i = 1; i < routeToUse.length; i++) {
            const prev = routeToUse[i - 1];
            const curr = routeToUse[i];
            totalDistance += this.calculateDistance(prev, curr);
        }
        
        const paceMinutes = 5.5;
        const durationMinutes = totalDistance * paceMinutes;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = Math.floor(durationMinutes % 60);
        
        const elevation = Math.floor(totalDistance * 50);
        
        const distanceElement = document.getElementById('distance');
        const durationElement = document.getElementById('duration');
        const elevationElement = document.getElementById('elevation');
        const paceElement = document.getElementById('pace');
        
        if (distanceElement) distanceElement.textContent = `${totalDistance.toFixed(1)} km`;
        if (durationElement) durationElement.textContent = `${hours}:${minutes.toString().padStart(2, '0')}`;
        if (elevationElement) elevationElement.textContent = `${elevation} m`;
        if (paceElement) paceElement.textContent = `${paceMinutes}:00`;
    }

    calculateDistance(point1, point2) {
        const R = 6371;
        const dLat = (point2[0] - point1[0]) * Math.PI / 180;
        const dLon = (point2[1] - point1[1]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    updateStatus(message) {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    showLoading(message) {
        const loadingMessageElement = document.getElementById('loadingMessage');
        const loadingOverlayElement = document.getElementById('loadingOverlay');
        
        if (loadingMessageElement) {
            loadingMessageElement.textContent = message;
        }
        if (loadingOverlayElement) {
            loadingOverlayElement.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingOverlayElement = document.getElementById('loadingOverlay');
        if (loadingOverlayElement) {
            loadingOverlayElement.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            console.warn('Toast container not found');
            return;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
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
            const distanceElement = document.getElementById('distance');
            const durationElement = document.getElementById('duration');
            const elevationElement = document.getElementById('elevation');
            
            const jsonContent = JSON.stringify({
                route: routeToUse,
                metadata: {
                    distance: distanceElement ? distanceElement.textContent : '0.0 km',
                    duration: durationElement ? durationElement.textContent : '0:00',
                    elevation: elevationElement ? elevationElement.textContent : '0 m',
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

    previewLapStats() {
        if (!this.currentRoute || this.currentRoute.length < 2) {
            this.updateStats();
            return;
        }
        const loopTypeElement = document.getElementById('loopType');
        const numLoopsElement = document.getElementById('numLoops');
        const gapDistanceElement = document.getElementById('gapDistance');
        if (!loopTypeElement || !numLoopsElement || !gapDistanceElement) {
            this.updateStats();
            return;
        }
        const loopType = loopTypeElement.value;
        const numLoops = parseInt(numLoopsElement.value);
        const gapDistance = parseInt(gapDistanceElement.value);
        const previewRoute = window.RouteTemplates.generateLoopRoute(
            this.currentRoute,
            loopType,
            { numLoops, gapDistance }
        );
        this.updateStats(previewRoute);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.routeGenerator = new GPXRouteGenerator();

    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const toggleIcon = toggleBtn ? toggleBtn.querySelector('i') : null;
    if (toggleBtn) {
       
        toggleBtn.style.left = sidebar && sidebar.classList.contains('sidebar-collapsed') ? '48px' : '350px';
        toggleBtn.style.transition = 'left 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s';
    }
    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const collapsed = sidebar.classList.toggle('sidebar-collapsed');
            if (window.routeGenerator && window.routeGenerator.map) {
                window.routeGenerator.map.invalidateSize();
            }
            if (toggleIcon) {
                toggleIcon.className = collapsed ? 'fas fa-bars' : 'fas fa-times';
            }
            toggleBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
         
            toggleBtn.style.left = collapsed ? '48px' : '350px';
            toggleBtn.focus();
        });
    }

    const searchInput = document.getElementById('locationSearch');
    const suggestionsList = document.getElementById('searchSuggestions');
    let debounceTimeout = null;
    let activeIndex = -1;
    let currentSuggestions = [];
    let searchMarker = null;

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'search-clear-btn';
    clearBtn.innerHTML = '&times;';
    clearBtn.title = 'Clear search';
    clearBtn.style.display = 'none';
    searchInput.parentNode.appendChild(clearBtn);

    function clearSuggestions() {
        suggestionsList.innerHTML = '';
        activeIndex = -1;
        currentSuggestions = [];
    }

    function showSuggestions(features) {
        clearSuggestions();
        features.forEach((feature, idx) => {
            const li = document.createElement('li');
            li.textContent = feature.place_name;
            li.addEventListener('click', () => {
                flyToFeature(feature);
                clearSuggestions();
                searchInput.value = feature.place_name;
                clearBtn.style.display = 'block';
            });
            suggestionsList.appendChild(li);
        });
        currentSuggestions = features;
    }

    function flyToFeature(feature) {
        if (window.routeGenerator && window.routeGenerator.map && feature.center) {
            const map = window.routeGenerator.map;
            const targetLatLng = L.latLng(feature.center[1], feature.center[0]);
            map.setView(targetLatLng, 15, { animate: false });
 
            if (searchMarker) {
                map.removeLayer(searchMarker);
            }
            searchMarker = L.marker(targetLatLng, {
                icon: L.icon({
                    iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
                    shadowSize: [41, 41]
                })
            }).addTo(map);
            searchMarker.bindPopup(feature.place_name).openPopup();
        }
    }

    searchInput && searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearBtn.style.display = query ? 'block' : 'none';
        if (!query) {
            clearSuggestions();
            if (searchMarker && window.routeGenerator && window.routeGenerator.map) {
                window.routeGenerator.map.removeLayer(searchMarker);
                searchMarker = null;
            }
            return;
        }
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            let proximity = '';
            if (window.routeGenerator && window.routeGenerator.map) {
                const center = window.routeGenerator.map.getCenter();
                proximity = `&proximity=${center.lng},${center.lat}`;
            }
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${window.MAPBOX_TOKEN}&autocomplete=true&limit=5${proximity}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.features) {
                        showSuggestions(data.features);
                    } else {
                        clearSuggestions();
                    }
                })
                .catch(() => clearSuggestions());
        }, 300);
    });
    searchInput && searchInput.addEventListener('keydown', (e) => {
        const items = suggestionsList.querySelectorAll('li');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            updateActive();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            updateActive();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0) {
                items[activeIndex].click();
            } else if (currentSuggestions.length > 0) {
                flyToFeature(currentSuggestions[0]);
                searchInput.value = currentSuggestions[0].place_name;
                clearSuggestions();
                clearBtn.style.display = 'block';
            }
        }
    });

    function updateActive() {
        const items = suggestionsList.querySelectorAll('li');
        items.forEach((li, idx) => {
            if (idx === activeIndex) {
                li.classList.add('active');
                li.scrollIntoView({ block: 'nearest' });
            } else {
                li.classList.remove('active');
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target) && e.target !== clearBtn) {
            clearSuggestions();
        }
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        clearSuggestions();
        if (searchMarker && window.routeGenerator && window.routeGenerator.map) {
            window.routeGenerator.map.removeLayer(searchMarker);
            searchMarker = null;
        }
        searchInput.focus();
    });
}); 