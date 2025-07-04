/**
 * Route Optimization Module
 * Advanced route optimization algorithms for distance, elevation, and smoothing
 */

class RouteOptimization {
    constructor() {
        this.optimizationAlgorithms = {
            'distance': this.optimizeDistance.bind(this),
            'smoothing': this.smoothRoute.bind(this),
            'simplification': this.simplifyRoute.bind(this)
        };
    }

    /**
     * Optimize route for minimum distance
     */
    optimizeDistance(coordinates, options = {}) {
        const { preserveStartEnd = true, maxIterations = 100 } = options;
        
        if (coordinates.length < 3) return coordinates;

        let optimizedRoute = [...coordinates];
        let bestDistance = this.calculateTotalDistance(optimizedRoute);
        let improved = true;
        let iterations = 0;

        while (improved && iterations < maxIterations) {
            improved = false;
            iterations++;

            for (let i = 1; i < optimizedRoute.length - 1; i++) {
                const originalPoint = optimizedRoute[i];
                
                // Try to find a better position for this point
                const neighbors = this.findNearbyPoints(originalPoint, optimizedRoute, i);
                
                for (const neighbor of neighbors) {
                    const testRoute = [...optimizedRoute];
                    testRoute[i] = neighbor;
                    
                    const testDistance = this.calculateTotalDistance(testRoute);
                    
                    if (testDistance < bestDistance) {
                        optimizedRoute = testRoute;
                        bestDistance = testDistance;
                        improved = true;
                    }
                }
            }
        }

        return optimizedRoute;
    }

    /**
     * Smooth route using spline interpolation
     */
    smoothRoute(coordinates, options = {}) {
        const { smoothingFactor = 0.3, preserveEndpoints = true } = options;
        
        if (coordinates.length < 3) return coordinates;

        const smoothed = [];
        
        for (let i = 0; i < coordinates.length; i++) {
            if (i === 0 || i === coordinates.length - 1) {
                if (preserveEndpoints) {
                    smoothed.push(coordinates[i]);
                    continue;
                }
            }

            // Apply smoothing using weighted average of neighboring points
            const prev = i > 0 ? coordinates[i - 1] : coordinates[i];
            const curr = coordinates[i];
            const next = i < coordinates.length - 1 ? coordinates[i + 1] : coordinates[i];

            const smoothedPoint = [
                curr[0] * (1 - smoothingFactor) + (prev[0] + next[0]) / 2 * smoothingFactor,
                curr[1] * (1 - smoothingFactor) + (prev[1] + next[1]) / 2 * smoothingFactor
            ];

            smoothed.push(smoothedPoint);
        }

        return smoothed;
    }

    /**
     * Simplify route using Douglas-Peucker algorithm
     */
    simplifyRoute(coordinates, options = {}) {
        const { tolerance = 0.0001, preserveEndpoints = true } = options;
        
        if (coordinates.length < 3) return coordinates;

        return this.douglasPeucker(coordinates, tolerance, preserveEndpoints);
    }

    /**
     * Douglas-Peucker line simplification algorithm
     */
    douglasPeucker(points, tolerance, preserveEndpoints) {
        if (points.length <= 2) return points;

        let maxDistance = 0;
        let maxIndex = 0;

        const start = points[0];
        const end = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.pointToLineDistance(points[i], start, end);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }

        if (maxDistance > tolerance) {
            const firstLine = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance, preserveEndpoints);
            const secondLine = this.douglasPeucker(points.slice(maxIndex), tolerance, preserveEndpoints);
            
            return firstLine.slice(0, -1).concat(secondLine);
        } else {
            return preserveEndpoints ? [start, end] : [start];
        }
    }

    /**
     * Calculate distance from point to line segment
     */
    pointToLineDistance(point, lineStart, lineEnd) {
        const A = point[0] - lineStart[0];
        const B = point[1] - lineStart[1];
        const C = lineEnd[0] - lineStart[0];
        const D = lineEnd[1] - lineStart[1];

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = lineStart[0];
            yy = lineStart[1];
        } else if (param > 1) {
            xx = lineEnd[0];
            yy = lineEnd[1];
        } else {
            xx = lineStart[0] + param * C;
            yy = lineStart[1] + param * D;
        }

        const dx = point[0] - xx;
        const dy = point[1] - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Find nearby points for optimization
     */
    findNearbyPoints(point, route, excludeIndex) {
        const nearby = [];
        const searchRadius = 0.001; // ~100 meters

        for (let lat = -1; lat <= 1; lat++) {
            for (let lng = -1; lng <= 1; lng++) {
                const testPoint = [
                    point[0] + lat * searchRadius,
                    point[1] + lng * searchRadius
                ];

                // Check if this point is valid (not too close to other route points)
                let isValid = true;
                for (let i = 0; i < route.length; i++) {
                    if (i !== excludeIndex) {
                        const distance = this.calculateDistance(testPoint, route[i]);
                        if (distance < searchRadius * 0.5) {
                            isValid = false;
                            break;
                        }
                    }
                }

                if (isValid) {
                    nearby.push(testPoint);
                }
            }
        }

        return nearby;
    }

    /**
     * Calculate total distance of route
     */
    calculateTotalDistance(coordinates) {
        let totalDistance = 0;
        
        for (let i = 1; i < coordinates.length; i++) {
            totalDistance += this.calculateDistance(coordinates[i - 1], coordinates[i]);
        }
        
        return totalDistance;
    }

    /**
     * Calculate distance between two points
     */
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

    /**
     * Optimize route using specified algorithm
     */
    async optimizeRoute(coordinates, algorithm, options = {}) {
        if (!this.optimizationAlgorithms[algorithm]) {
            throw new Error(`Unknown optimization algorithm: ${algorithm}`);
        }

        return await this.optimizationAlgorithms[algorithm](coordinates, options);
    }

    /**
     * Apply multiple optimizations in sequence
     */
    async optimizeRouteMulti(coordinates, algorithms, options = {}) {
        let optimizedRoute = [...coordinates];
        
        for (const algorithm of algorithms) {
            optimizedRoute = await this.optimizeRoute(optimizedRoute, algorithm, options[algorithm] || {});
        }
        
        return optimizedRoute;
    }

    /**
     * Generate route statistics
     */
    async generateRouteStats(coordinates) {
        const distance = this.calculateTotalDistance(coordinates);
        
        return {
            distance: distance,
            points: coordinates.length,
            averageSegmentLength: distance / (coordinates.length - 1)
        };
    }
}

// Create global instance
window.RouteOptimization = new RouteOptimization();
