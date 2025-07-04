

class ShapeTemplates {
    
    static heart(center, radius = 500, points = 100) {
        const coords = [];
        const [lat0, lng0] = center;
        for (let i = 0; i < points; i++) {
            const t = Math.PI * 2 * (i / points);
            
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            
            const lat = lat0 + (y * radius * 0.00000899);
            const lng = lng0 + (x * radius * 0.00001141);
            coords.push([lat, lng]);
        }
        return coords;
    }

    
    static circle(center, radius = 500, points = 100) {
        const coords = [];
        const [lat0, lng0] = center;
        for (let i = 0; i < points; i++) {
            const angle = (2 * Math.PI * i) / points;
            const lat = lat0 + (radius * Math.cos(angle) * 0.00000899);
            const lng = lng0 + (radius * Math.sin(angle) * 0.00001141);
            coords.push([lat, lng]);
        }
        return coords;
    }

    
    static star(center, radius = 500, points = 5) {
        const coords = [];
        const [lat0, lng0] = center;
        const step = Math.PI / points;
        for (let i = 0; i < 2 * points; i++) {
            const r = i % 2 === 0 ? radius : radius / 2;
            const angle = i * step;
            const lat = lat0 + (r * Math.cos(angle) * 0.00000899);
            const lng = lng0 + (r * Math.sin(angle) * 0.00001141);
            coords.push([lat, lng]);
        }
        coords.push(coords[0]); 
        return coords;
    }

    
    static square(center, radius = 500) {
        const [lat0, lng0] = center;
        const dLat = radius * 0.00000899;
        const dLng = radius * 0.00001141;
        return [
            [lat0 - dLat, lng0 - dLng],
            [lat0 - dLat, lng0 + dLng],
            [lat0 + dLat, lng0 + dLng],
            [lat0 + dLat, lng0 - dLng],
            [lat0 - dLat, lng0 - dLng], 
        ];
    }
}

window.ShapeTemplates = ShapeTemplates; 