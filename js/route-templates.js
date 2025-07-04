

class RouteTemplates {
    constructor() {
        this.templates = {
            
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

    
    getAllTemplates() {
        return this.templates;
    }

    
    getTemplate(name) {
        return this.templates[name];
    }

    
    getLoopTypes() {
        return this.loopTypes;
    }

    
    async applyTemplate(templateName, map) {
        const template = this.getTemplate(templateName);
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        
        if (window.routeMap && window.routeMap.drawnItems) {
            window.routeMap.drawnItems.clearLayers();
        }

        
        const poly = L.polyline(template.coordinates, { 
            color: '#e67e22', 
            weight: 5 
        });
        
        if (window.routeMap && window.routeMap.drawnItems) {
            window.routeMap.drawnItems.addLayer(poly);
        }

        
        if (map) {
            map.fitBounds(poly.getBounds());
        }

        return template;
    }

    
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

    
    saveTemplate(template) {
        const savedTemplates = JSON.parse(localStorage.getItem('savedTemplates') || '{}');
        savedTemplates[template.name] = template;
        localStorage.setItem('savedTemplates', JSON.stringify(savedTemplates));
    }

    
    loadSavedTemplates() {
        const savedTemplates = JSON.parse(localStorage.getItem('savedTemplates') || '{}');
        return savedTemplates;
    }

    
    generateLapsRoute(baseCoordinates, options = {}) {
        const { numLoops = 1, gapDistance = 50 } = options;
        let route = [];
        for (let i = 0; i < numLoops; i++) {
            if (i > 0 && gapDistance > 0) {
                
                const lastCoord = route[route.length - 1];
                const firstCoord = (i % 2 === 0) ? baseCoordinates[0] : baseCoordinates[baseCoordinates.length - 1];
                const gapCoords = this.createGapCoords(lastCoord, firstCoord, gapDistance);
                route.push(...gapCoords);
            }
            
            if (i % 2 === 0) {
                route.push(...baseCoordinates);
            } else {
                route.push(...baseCoordinates.slice().reverse());
            }
        }
        return route;
    }

    
    generateLoopRoute(baseCoordinates, loopType, options = {}) {
        
        return this.generateLapsRoute(baseCoordinates, options);
    }

    
    calculateCenter(coordinates) {
        const sumLat = coordinates.reduce((sum, coord) => sum + coord[0], 0);
        const sumLng = coordinates.reduce((sum, coord) => sum + coord[1], 0);
        return [sumLat / coordinates.length, sumLng / coordinates.length];
    }

    
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


window.RouteTemplates = new RouteTemplates(); 