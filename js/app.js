document.addEventListener('DOMContentLoaded', function () {
    // Initialize the map
    const map = L.map('map', {
        center: [37.7749, -122.4194], // Default to San Francisco
        zoom: 13,
        zoomControl: true,
        attributionControl: true
    });

    // Add Mapbox tile layer
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoiam9nYXRldiIsImEiOiJjbWNsajl1MWgwY2ZsMm1vbTN6enJnZ245In0.Us4E9e5nunbG0G0JbQI1Bw', {
        maxZoom: 19,
        attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        id: 'mapbox/streets-v11', // You can change to outdoors-v12, satellite-v9, etc.
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1Ijoiam9nYXRldiIsImEiOiJjbWNsajl1MWgwY2ZsMm1vbTN6enJnZ245In0.Us4E9e5nunbG0G0JbQI1Bw'
    }).addTo(map);

    // Show coordinates on mouse move
    map.on('mousemove', function (e) {
        if (window.Utils) {
            Utils.updateCoordinates(e.latlng.lat, e.latlng.lng);
        }
    });

    // Expose map for other modules
    window.routeMap = map;

    // --- Drawing Layer ---
    let drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Leaflet.draw controls
    const drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            remove: true
        },
        draw: {
            polyline: {
                shapeOptions: { color: '#3498db', weight: 5 },
                allowIntersection: true,
                showLength: true
            },
            polygon: {
                allowIntersection: true,
                showArea: true,
                shapeOptions: { color: '#8e44ad', weight: 4 }
            },
            rectangle: false,
            circle: false,
            marker: {
                icon: new L.Icon.Default()
            }
        }
    });
    map.addControl(drawControl);

    // Store current route state
    let currentRoute = {
        coordinates: [],
        elevations: [],
        timestamps: [],
        layer: null
    };

    // --- Drawing Tools: Draw Route (Extendable) ---
    const drawPolylineBtn = document.getElementById('drawPolyline');
    let drawPolylineHandler = null;

    if (drawPolylineBtn) {
        drawPolylineBtn.addEventListener('click', function () {
            // Activate polyline drawing mode
            if (drawPolylineHandler) {
                drawPolylineHandler.disable();
            }
            drawPolylineHandler = new L.Draw.Polyline(map, drawControl.options.draw.polyline);
            drawPolylineHandler.enable();
        });
    }

    // --- Drawing Events (Extended) ---
    map.on(L.Draw.Event.CREATED, async function (e) {
        const layer = e.layer;
        // If drawing a polyline and a route already exists, extend it
        if (layer instanceof L.Polyline && currentRoute.coordinates.length > 0) {
            // Get new segment points
            let newCoords = layer.getLatLngs();
            if (Array.isArray(newCoords[0])) newCoords = newCoords[0];
            const newLatLngs = newCoords.map(ll => [ll.lat, ll.lng]);
            // Merge with existing route (append to end)
            const mergedCoords = currentRoute.coordinates.concat(newLatLngs);
            lastDrawnCoords = mergedCoords;
            isSnapped = false;
            alignPathBtn.style.display = 'flex';
            await handleRouteDraw(mergedCoords, { skipSnap: true });
        } else if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
            // Default behavior for new route
            drawnItems.clearLayers();
            drawnItems.addLayer(layer);
            let coords = layer.getLatLngs();
            if (Array.isArray(coords[0])) coords = coords[0];
            const latlngs = coords.map(ll => [ll.lat, ll.lng]);
            lastDrawnCoords = latlngs;
            isSnapped = false;
            alignPathBtn.style.display = 'flex';
            await handleRouteDraw(latlngs, { skipSnap: true });
        }
    });

    // --- Shape Templates ---
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const shape = btn.getAttribute('data-shape');
            const center = map.getCenter();
            let coords = [];
            if (window.ShapeTemplates) {
                if (shape === 'heart') coords = ShapeTemplates.heart([center.lat, center.lng]);
                if (shape === 'circle') coords = ShapeTemplates.circle([center.lat, center.lng]);
                if (shape === 'star') coords = ShapeTemplates.star([center.lat, center.lng]);
                if (shape === 'square') coords = ShapeTemplates.square([center.lat, center.lng]);
            }
            if (coords.length) {
                // Draw the shape as a polyline
                const poly = L.polyline(coords, { color: '#e67e22', weight: 5 });
                drawnItems.addLayer(poly);
                await handleRouteDraw(coords);
            }
        });
    });

    // --- Clear All ---
    document.getElementById('clearAll').addEventListener('click', function () {
        drawnItems.clearLayers();
        currentRoute = { coordinates: [], elevations: [], timestamps: [], layer: null };
        updateRouteInfo();
    });

    // --- Export GPX ---
    document.getElementById('exportGPX').addEventListener('click', function () {
        if (currentRoute.coordinates.length) {
            const gpx = GPXExport.generateGPX(
                currentRoute.coordinates,
                currentRoute.elevations,
                currentRoute.timestamps,
                { name: 'Custom Route', desc: 'Generated by Route Generator' }
            );
            GPXExport.downloadGPX(gpx, 'route.gpx');
        } else {
            Utils.updateStatus('Draw a route first!');
        }
    });

    // --- Align Path to Road Button Logic (improved) ---
    const alignPathBtn = document.getElementById('alignPathBtn');
    let lastDrawnCoords = null;
    let isSnapped = false;

    // Align Path to Road button click
    alignPathBtn.addEventListener('click', async function () {
        if (!lastDrawnCoords || !lastDrawnCoords.length) {
            Utils.updateStatus('Draw a route first!');
            return;
        }
        alignPathBtn.disabled = true;
        alignPathBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aligning...';
        try {
            await handleRouteDraw(lastDrawnCoords, { forceSnap: true });
            isSnapped = true;
        } finally {
            alignPathBtn.disabled = false;
            alignPathBtn.innerHTML = '<i class="fas fa-route"></i> Align Path to Road';
        }
    });

    // --- Handle Route Drawing, Snapping, Elevation, and Timestamps ---
    async function handleRouteDraw(coords, options = {}) {
        Utils.showLoading('Processing route...');
        let snappedCoords = coords;
        if ((options.forceSnap || (!options.skipSnap && !isSnapped)) && window.RouteSnappingService) {
            // Use walking profile by default for best path coverage
            snappedCoords = await window.RouteSnappingService.snapToRoads(coords, { profile: 'walking' });
        }
        // Get elevation data
        let elevations = [];
        if (window.ElevationService) {
            elevations = await window.ElevationService.getElevationData(snappedCoords);
        }
        // Generate timestamps based on pace
        const pace = parseFloat(document.getElementById('avgPace')?.value) || 5.5; // min/km
        const startTime = document.getElementById('runStartTime')?.value || new Date().toISOString();
        const timestamps = generateTimestamps(snappedCoords, pace, startTime);
        // Draw the route
        drawnItems.clearLayers();
        const poly = L.polyline(snappedCoords, { color: isSnapped ? '#3498db' : '#e67e22', weight: 5 });
        drawnItems.addLayer(poly);
        // Update current route state
        currentRoute = {
            coordinates: snappedCoords,
            elevations,
            timestamps,
            layer: poly
        };
        updateRouteInfo();
        Utils.hideLoading();
    }

    // --- Modified generateTimestamps to ensure valid date ---
    function generateTimestamps(coords, pace, startTime) {
        if (!coords.length) return [];
        let timestamps = [];
        let totalSeconds = 0;
        let prev = coords[0];
        // Ensure startTime is a valid ISO string
        let time = startTime ? new Date(startTime) : new Date();
        if (isNaN(time.getTime())) time = new Date();
        timestamps.push(time.toISOString());
        for (let i = 1; i < coords.length; i++) {
            const dist = Utils.calculateDistance(prev[0], prev[1], coords[i][0], coords[i][1]); // km
            const seconds = dist * pace * 60; // pace in min/km
            totalSeconds += seconds;
            let nextTime = new Date(time.getTime() + totalSeconds * 1000);
            timestamps.push(nextTime.toISOString());
            prev = coords[i];
        }
        return timestamps;
    }

    // --- Update Route Info Panel ---
    function updateRouteInfo() {
        const dist = Utils.calculateRouteDistance(currentRoute.coordinates);
        const elevGain = Utils.calculateElevationGain(currentRoute.elevations);
        const duration = currentRoute.timestamps.length > 1
            ? (new Date(currentRoute.timestamps.at(-1)) - new Date(currentRoute.timestamps[0])) / 1000
            : 0;
        document.getElementById('distance').textContent = Utils.formatDistance(dist);
        document.getElementById('elevationGain').textContent = Utils.formatElevation(elevGain);
        document.getElementById('duration').textContent = Utils.formatDuration(duration);
        document.getElementById('pointCount').textContent = currentRoute.coordinates.length;
    }

    // --- Mapbox Geocoding Search with Suggestions ---
    const mapboxToken = window.MAPBOX_TOKEN;
    const searchInput = document.getElementById('locationSearch');
    const searchBtn = document.getElementById('searchBtn');
    const suggestionsBox = document.getElementById('searchSuggestions');
    let searchResults = [];
    let activeSuggestion = -1;
    let searchMarker = null;

    // Helper: Clear previous search marker
    function clearSearchMarker() {
        if (searchMarker) {
            map.removeLayer(searchMarker);
            searchMarker = null;
        }
    }

    // Fetch suggestions from Mapbox Geocoding API
    async function fetchSuggestions(query) {
        if (!query) return [];
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&autocomplete=true&limit=6`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data.features || [];
    }

    // Render suggestions dropdown
    function renderSuggestions(suggestions) {
        suggestionsBox.innerHTML = '';
        if (!suggestions.length) {
            suggestionsBox.style.display = 'none';
            return;
        }
        suggestions.forEach((feature, idx) => {
            const div = document.createElement('div');
            div.className = 'search-suggestion' + (idx === activeSuggestion ? ' active' : '');
            div.textContent = feature.place_name;
            div.addEventListener('mousedown', e => {
                e.preventDefault();
                selectSuggestion(idx, true);
            });
            suggestionsBox.appendChild(div);
        });
        suggestionsBox.style.display = 'block';
    }

    // Select a suggestion or perform a search
    function selectSuggestion(idx, fromDropdown = false) {
        const feature = searchResults[idx];
        if (!feature) return;
        // Pan/zoom to location
        map.setView([feature.center[1], feature.center[0]], 16);
        // Remove previous search marker
        clearSearchMarker();
        // Place a new marker
        searchMarker = L.marker([feature.center[1], feature.center[0]]).addTo(map);
        // Hide suggestions
        suggestionsBox.style.display = 'none';
        searchInput.value = feature.place_name;
        if (fromDropdown) searchInput.blur();
    }

    // Handle input events
    searchInput.addEventListener('input', Utils.debounce(async function (e) {
        const query = searchInput.value.trim();
        clearSearchMarker();
        if (!query) {
            suggestionsBox.style.display = 'none';
            return;
        }
        searchResults = await fetchSuggestions(query);
        activeSuggestion = -1;
        renderSuggestions(searchResults);
    }, 250));

    // Keyboard navigation for suggestions and Enter to search
    searchInput.addEventListener('keydown', function (e) {
        if (!searchResults.length) return;
        if (e.key === 'ArrowDown') {
            activeSuggestion = (activeSuggestion + 1) % searchResults.length;
            renderSuggestions(searchResults);
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            activeSuggestion = (activeSuggestion - 1 + searchResults.length) % searchResults.length;
            renderSuggestions(searchResults);
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (activeSuggestion >= 0) {
                selectSuggestion(activeSuggestion, true);
                e.preventDefault();
            } else if (searchResults.length > 0) {
                selectSuggestion(0, true);
                e.preventDefault();
            } else {
                Utils.updateStatus('No results found.');
            }
            suggestionsBox.style.display = 'none';
        } else if (e.key === 'Escape') {
            suggestionsBox.style.display = 'none';
        }
    });

    // Search button click
    searchBtn.addEventListener('click', async function () {
        const query = searchInput.value.trim();
        if (!query) return;
        searchResults = await fetchSuggestions(query);
        if (searchResults.length) {
            selectSuggestion(0, true);
        } else {
            Utils.updateStatus('No results found.');
        }
        suggestionsBox.style.display = 'none';
    });

    // Hide suggestions when clicking outside
    document.addEventListener('mousedown', function (e) {
        if (!suggestionsBox.contains(e.target) && e.target !== searchInput) {
            suggestionsBox.style.display = 'none';
        }
    });

    // --- Run Details Controls ---
    const runStatDistance = document.getElementById('runStatDistance');
    const runStatDuration = document.getElementById('runStatDuration');
    const runStatElevation = document.getElementById('runStatElevation');
    const runStatPace = document.getElementById('runStatPace');
    const paceUnit = document.getElementById('paceUnit');
    const paceUnitLabel = document.getElementById('paceUnitLabel');
    const paceUnitLabel2 = document.getElementById('paceUnitLabel2');
    const avgPace = document.getElementById('avgPace');
    const avgPaceValue = document.getElementById('avgPaceValue');
    const paceInconsistency = document.getElementById('paceInconsistency');
    const paceInconsistencyValue = document.getElementById('paceInconsistencyValue');
    const activityTypeToggle = document.getElementById('activityTypeToggle');
    const includeHR = document.getElementById('includeHR');
    const runName = document.getElementById('runName');
    const runDate = document.getElementById('runDate');
    const runStartTime = document.getElementById('runStartTime');
    const runDesc = document.getElementById('runDesc');

    // Set today's date as default
    if (runDate) {
        const today = new Date();
        runDate.value = today.toISOString().slice(0, 10);
    }
    if (runStartTime) {
        const now = new Date();
        runStartTime.value = now.toTimeString().slice(0,5);
    }

    // Update pace unit labels
    function updatePaceUnitLabels() {
        const unit = paceUnit.value;
        paceUnitLabel.textContent = unit;
        paceUnitLabel2.textContent = unit;
    }
    if (paceUnit) {
        paceUnit.addEventListener('change', function() {
            updatePaceUnitLabels();
            updateRunStatsPanel();
        });
    }
    updatePaceUnitLabels();

    // Update average pace value
    if (avgPace) {
        avgPace.addEventListener('input', function() {
            avgPaceValue.textContent = parseFloat(avgPace.value).toFixed(2);
            runStatPace.textContent = parseFloat(avgPace.value).toFixed(2);
            updateRunStatsPanel();
        });
    }

    // Update pace inconsistency value
    if (paceInconsistency) {
        paceInconsistency.addEventListener('input', function() {
            paceInconsistencyValue.textContent = paceInconsistency.value + '%';
        });
    }

    // Update run stats panel with current route
    function updateRunStatsPanel() {
        const dist = Utils.calculateRouteDistance(currentRoute.coordinates);
        let pace = parseFloat(avgPace.value) || 5.5;
        let duration = dist * pace; // min
        if (paceUnit.value === 'min/mi') {
            // Convert km to mi
            pace = pace * 0.621371;
            duration = dist * 0.621371 * pace;
        }
        runStatDistance.textContent = dist.toFixed(2) + (paceUnit.value === 'min/km' ? ' km' : ' mi');
        runStatDuration.textContent = Utils.formatDuration(duration * 60);
        runStatElevation.textContent = Utils.formatElevation(Utils.calculateElevationGain(currentRoute.elevations));
        runStatPace.textContent = parseFloat(avgPace.value).toFixed(2);
    }

    // Update stats when route changes
    const originalUpdateRouteInfo = updateRouteInfo;
    updateRouteInfo = function() {
        originalUpdateRouteInfo();
        updateRunStatsPanel();
    };

    // Sync pace slider with Route Settings pace input
    const paceInput = document.getElementById('pace');
    if (paceInput && avgPace) {
        paceInput.addEventListener('input', function() {
            avgPace.value = paceInput.value;
            avgPaceValue.textContent = parseFloat(avgPace.value).toFixed(2);
            runStatPace.textContent = parseFloat(avgPace.value).toFixed(2);
            updateRunStatsPanel();
        });
        avgPace.addEventListener('input', function() {
            paceInput.value = avgPace.value;
        });
    }

    // Activity type toggle (Run/Bike)
    if (activityTypeToggle) {
        activityTypeToggle.addEventListener('change', function() {
            // You can add logic to change stats/labels for bike mode
            // For now, just update the color/icon
            document.querySelector('#runDetailsSection h3 i').className = activityTypeToggle.checked ? 'fas fa-biking' : 'fas fa-running';
        });
    }
}); 