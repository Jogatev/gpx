/**
 * Route Templates & Presets
 * Pre-built routes and configurations for popular running areas
 */

class RouteTemplates {
    constructor() {
        this.templates = {
            // Popular running routes
            'golden-gate-park': {
                name: 'Golden Gate Park Loop',
                description: 'Scenic loop through San Francisco\'s famous park',
                coordinates: [
                    [37.7694, -122.4862],
                    [37.7694, -122.4762],
                    [37.7594, -122.4762],
                    [37.7594, -122.4862],
                    [37.7694, -122.4862]
                ],
                distance: 3.2,
                difficulty: 'Easy',
                surface: 'Mixed',
                tags: ['Scenic', 'Flat', 'Park']
            },
            'embarcadero': {
                name: 'Embarcadero Waterfront',
                description: 'Beautiful waterfront route along San Francisco Bay',
                coordinates: [
                    [37.8085, -122.4098],
                    [37.8085, -122.3898],
                    [37.7985, -122.3898],
                    [37.7985, -122.4098]
                ],
                distance: 4.5,
                difficulty: 'Easy',
                surface: 'Pavement',
                tags: ['Waterfront', 'Flat', 'Scenic']
            },
            'twin-peaks': {
                name: 'Twin Peaks Challenge',
                description: 'Challenging hill route with great city views',
                coordinates: [
                    [37.7516, -122.4476],
                    [37.7516, -122.4376],
                    [37.7416, -122.4376],
                    [37.7416, -122.4476]
                ],
                distance: 2.8,
                difficulty: 'Hard',
                surface: 'Mixed',
                tags: ['Hilly', 'Scenic', 'Challenging']
            }
        };

        this.loopTypes = {
            'out-and-back': {
                name: 'Out and Back',
                description: 'Run out and return on the same path',
                icon: '↔️'
            },
            'circular': {
                name: 'Circular Loop',
                description: 'Complete circle route',
                icon: '🔄'
            },
            'figure-8': {
                name: 'Figure 8',
                description: 'Figure-eight pattern',
                icon: '∞'
            },
            'multiple-waypoints': {
                name: 'Multiple Waypoints',
                description: 'Route with multiple checkpoints',
                icon: '📍'
            }
        };
    }

    /**
     * Get all available templates
     */
    getAllTemplates() {
        return this.templates;
    }

    /**
     * Get template by name
     */
    getTemplate(name) {
        return this.templates[name];
    }

    /**
     * Get all loop types
     */
    getLoopTypes() {
        return this.loopTypes;
    }

    /**
     * Apply template to map
     */
    async applyTemplate(templateName, map) {
        const template = this.getTemplate(templateName);
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        // Clear existing routes
        if (window.routeMap && window.routeMap.drawnItems) {
            window.routeMap.drawnItems.clearLayers();
        }

        // Draw the template route
        const poly = L.polyline(template.coordinates, { 
            color: '#e67e22', 
            weight: 5 
        });
        
        if (window.routeMap && window.routeMap.drawnItems) {
            window.routeMap.drawnItems.addLayer(poly);
        }

        // Fit map to route
        if (map) {
            map.fitBounds(poly.getBounds());
        }

        return template;
    }

    /**
     * Create custom template
     */
    createCustomTemplate(name, coordinates, options = {}) {
        const template = {
            name: name,
            description: options.description || 'Custom route',
            coordinates: coordinates,
            distance: options.distance || 0,
            difficulty: options.difficulty || 'Medium',
            surface: options.surface || 'Mixed',
            tags: options.tags || []
        };

        this.templates[name.toLowerCase().replace(/\s+/g, '-')] = template;
        return template;
    }

    /**
     * Save template to localStorage
     */
    saveTemplate(template) {
        const savedTemplates = JSON.parse(localStorage.getItem('savedTemplates') || '{}');
        savedTemplates[template.name] = template;
        localStorage.setItem('savedTemplates', JSON.stringify(savedTemplates));
    }

    /**
     * Load templates from localStorage
     */
    loadSavedTemplates() {
        const savedTemplates = JSON.parse(localStorage.getItem('savedTemplates') || '{}');
        return savedTemplates;
    }

    /**
     * Generate route based on loop type
     */
    generateLoopRoute(baseCoordinates, loopType, options = {}) {
        switch (loopType) {
            case 'out-and-back':
                return this.generateOutAndBack(baseCoordinates, options);
            case 'circular':
                return this.generateCircularLoop(baseCoordinates, options);
            case 'figure-8':
                return this.generateFigure8(baseCoordinates, options);
            case 'multiple-waypoints':
                return this.generateMultipleWaypoints(baseCoordinates, options);
            default:
                return baseCoordinates;
        }
    }

    /**
     * Generate out-and-back route
     */
    generateOutAndBack(coordinates, options = {}) {
        const { numLoops = 1, gapDistance = 50 } = options;
        let route = [...coordinates];
        
        for (let i = 1; i < numLoops; i++) {
            // Add gap
            if (gapDistance > 0) {
                const lastCoord = route[route.length - 1];
                const firstCoord = coordinates[0];
                const gapCoords = this.createGapCoords(lastCoord, firstCoord, gapDistance);
                route.push(...gapCoords);
            }
            
            // Add reverse route
            route.push(...coordinates.slice().reverse());
        }
        
        return route;
    }

    /**
     * Generate circular loop
     */
    generateCircularLoop(coordinates, options = {}) {
        // Create a circular path around the center
        const center = this.calculateCenter(coordinates);
        const radius = options.radius || 0.5; // km
        const points = options.points || 20;
        
        const circularCoords = [];
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const lat = center[0] + (radius / 111) * Math.cos(angle);
            const lng = center[1] + (radius / (111 * Math.cos(center[0] * Math.PI / 180))) * Math.sin(angle);
            circularCoords.push([lat, lng]);
        }
        
        return circularCoords;
    }

    /**
     * Generate figure-8 route
     */
    generateFigure8(coordinates, options = {}) {
        const center = this.calculateCenter(coordinates);
        const radius = options.radius || 0.3; // km
        const points = options.points || 16;
        
        const figure8Coords = [];
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const r = radius * Math.sin(2 * angle);
            const lat = center[0] + (r / 111) * Math.cos(angle);
            const lng = center[1] + (r / (111 * Math.cos(center[0] * Math.PI / 180))) * Math.sin(angle);
            figure8Coords.push([lat, lng]);
        }
        
        return figure8Coords;
    }

    /**
     * Generate multiple waypoints route
     */
    generateMultipleWaypoints(coordinates, options = {}) {
        const waypoints = options.waypoints || [];
        if (waypoints.length === 0) return coordinates;
        
        let route = [...coordinates];
        
        waypoints.forEach((waypoint, index) => {
            if (index > 0) {
                // Add path to waypoint
                const prevWaypoint = waypoints[index - 1];
                const pathToWaypoint = this.interpolatePath(prevWaypoint, waypoint);
                route.push(...pathToWaypoint);
            }
        });
        
        return route;
    }

    /**
     * Calculate center of coordinates
     */
    calculateCenter(coordinates) {
        const sumLat = coordinates.reduce((sum, coord) => sum + coord[0], 0);
        const sumLng = coordinates.reduce((sum, coord) => sum + coord[1], 0);
        return [sumLat / coordinates.length, sumLng / coordinates.length];
    }

    /**
     * Create gap coordinates between two points
     */
    createGapCoords(startCoord, endCoord, gapDistance) {
        const gapCoords = [];
        const steps = 3;
        
        for (let i = 1; i <= steps; i++) {
            const ratio = i / (steps + 1);
            const lat = startCoord[0] + (endCoord[0] - startCoord[0]) * ratio;
            const lng = startCoord[1] + (endCoord[1] - startCoord[1]) * ratio;
            gapCoords.push([lat, lng]);
        }
        
        return gapCoords;
    }

    /**
     * Interpolate path between two points
     */
    interpolatePath(start, end, points = 5) {
        const path = [];
        for (let i = 0; i <= points; i++) {
            const ratio = i / points;
            const lat = start[0] + (end[0] - start[0]) * ratio;
            const lng = start[1] + (end[1] - start[1]) * ratio;
            path.push([lat, lng]);
        }
        return path;
    }
}

// Create global instance
window.RouteTemplates = new RouteTemplates(); 