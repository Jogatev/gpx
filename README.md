# 🏃‍♂️ GPX Route Generator v2.0

**Advanced running route creator with smart snapping, templates, and optimization**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/gpx-route-generator)

## ✨ Features

### 🎯 **Core Functionality**
- **Interactive Route Drawing** - Click to draw routes on the map
- **Smart Road Snapping** - Automatically snap routes to roads and paths
- **Multiple Transport Modes** - Walking, cycling, and driving profiles
- **Real-time Statistics** - Distance, duration, elevation, and pace calculations

### 🏗️ **Route Templates & Presets**
- **Pre-built Routes** - Golden Gate Park, Embarcadero, Twin Peaks
- **Custom Templates** - Save and reuse your favorite routes
- **Loop Types** - Out-and-back, circular, figure-8, multiple waypoints
- **Template Library** - Browse and apply popular running routes

### 🔄 **Advanced Looping**
- **Out-and-Back Loops** - Perfect for training runs
- **Circular Routes** - Scenic loop options
- **Figure-8 Patterns** - Complex route variations
- **Multiple Laps** - Repeat routes with configurable gaps
- **Gap Control** - Adjust spacing between loops

### 🧠 **Route Optimization**
- **Distance Optimization** - Find shortest routes
- **Route Smoothing** - Remove sharp turns and jitters
- **Point Simplification** - Reduce route complexity
- **Multi-algorithm Support** - Combine different optimization techniques

### 📊 **Enhanced Statistics**
- **Real-time Updates** - Live distance and duration calculations
- **Elevation Data** - Track elevation gain and loss
- **Pace Analysis** - Average pace and variations
- **Route Analytics** - Detailed route statistics

### 📤 **Multiple Export Formats**
- **GPX** - Standard GPS exchange format
- **KML** - Google Earth compatibility
- **JSON** - Programmatic access
- **TCX** - Training Center XML
- **CSV** - Spreadsheet compatibility
- **FIT** - Garmin device format

### 🎨 **Modern UI/UX**
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark/Light Themes** - Beautiful gradient backgrounds
- **Toast Notifications** - User-friendly feedback
- **Loading States** - Smooth user experience
- **Keyboard Shortcuts** - Power user features

### ⚡ **Performance Features**
- **Auto-snap Toggle** - Enable/disable automatic road snapping
- **Undo/Redo** - Easy route editing
- **Fit to Route** - Automatic map zooming
- **Quick Actions** - One-click common operations

## 🚀 Quick Start

### 1. **Clone the Repository**
```bash
git clone https://github.com/yourusername/gpx-route-generator.git
cd gpx-route-generator
```

### 2. **Set Up Environment Variables**
Create a `.env` file or set environment variables:

```env
MAPBOX_TOKEN=your_mapbox_token_here
ORS_API_KEY=your_openrouteservice_key_here
```

### 3. **Install Dependencies**
```bash
npm install
```

### 4. **Start Development Server**
```bash
npm start
# or
npm run dev
```

### 5. **Open in Browser**
Navigate to `http://localhost:8000`

## 🔧 Configuration

### **Environment Variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `MAPBOX_TOKEN` | Mapbox API token for maps and elevation | Yes |
| `ORS_API_KEY` | OpenRouteService API key for snapping | Yes |

### **Vercel Deployment**

1. **Connect to Vercel**
```bash
npm install -g vercel
vercel login
```

2. **Set Environment Variables**
```bash
vercel env add MAPBOX_TOKEN
vercel env add ORS_API_KEY
```

3. **Deploy**
```bash
vercel --prod
```

## 📖 Usage Guide

### **Drawing Routes**

1. **Select Draw Mode** - Click the pencil icon in map controls
2. **Click to Add Points** - Click on the map to add route points
3. **Auto-snap Enabled** - Routes automatically snap to roads
4. **Manual Snap** - Use "Snap Route" button for manual snapping

### **Using Templates**

1. **Select Template** - Choose from dropdown menu
2. **Click Apply** - Template route appears on map
3. **Customize** - Modify the template route as needed
4. **Save Custom** - Save your modified route as a new template

### **Creating Loops**

1. **Draw Base Route** - Create your initial route
2. **Select Loop Type** - Choose from out-and-back, circular, etc.
3. **Set Parameters** - Configure number of loops and gap distance
4. **Generate Loop** - Click "Create Loop" to apply

### **Optimizing Routes**

1. **Draw Route** - Create your initial route
2. **Select Algorithm** - Choose optimization type
3. **Configure Options** - Set optimization parameters
4. **Apply Optimization** - Click optimize button

### **Exporting Routes**

1. **Complete Route** - Finish drawing and snapping
2. **Choose Format** - Select export format (GPX, KML, JSON, etc.)
3. **Download** - File downloads automatically
4. **Import** - Use in your favorite fitness app

## 🎯 Advanced Features

### **Keyboard Shortcuts**

| Shortcut | Action |
|----------|--------|
| `Escape` | Clear current route |
| `Ctrl+Z` | Undo last point |
| `Ctrl+F` | Fit map to route |
| `Space` | Toggle draw/pan mode |

### **Route Optimization Algorithms**

- **Distance Optimization** - Minimizes total route distance
- **Smoothing** - Removes sharp turns and jitters
- **Simplification** - Reduces route complexity using Douglas-Peucker
- **Multi-optimization** - Apply multiple algorithms in sequence

### **Template System**

- **Built-in Templates** - Popular running routes
- **Custom Templates** - Save your own routes
- **Template Sharing** - Export/import template files
- **Template Categories** - Organize by difficulty, surface, etc.

### **Export Options**

- **GPX** - Standard GPS format with metadata
- **KML** - Google Earth compatibility with styling
- **JSON** - Programmatic access with statistics
- **TCX** - Garmin Training Center format
- **CSV** - Spreadsheet-friendly format
- **FIT** - Garmin device binary format

## 🛠️ Development

### **Project Structure**

```
gpx-route-generator/
├── index.html              # Main application
├── styles.css              # Modern CSS styling
├── js/
│   ├── app.js              # Main application logic
│   ├── utils.js            # Utility functions
│   ├── elevation.js        # Elevation data handling
│   ├── route-snapping.js   # Road snapping logic
│   ├── route-templates.js  # Template system
│   ├── route-optimization.js # Optimization algorithms
│   └── gpx-export.js       # Export functionality
├── package.json            # Dependencies and scripts
├── vercel.json            # Deployment configuration
└── README.md              # This file
```

### **Adding New Features**

1. **Create Module** - Add new JS file in `js/` directory
2. **Update HTML** - Include script tag in `index.html`
3. **Add UI Elements** - Update HTML and CSS as needed
4. **Test Integration** - Ensure compatibility with existing features

### **API Integration**

The app integrates with several APIs:

- **Mapbox** - Map tiles and elevation data
- **OpenRouteService** - Route snapping and optimization
- **OpenTopoData** - Elevation data (fallback)

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch** - `git checkout -b feature/amazing-feature`
3. **Commit Changes** - `git commit -m 'Add amazing feature'`
4. **Push to Branch** - `git push origin feature/amazing-feature`
5. **Open Pull Request** - Describe your changes

### **Development Guidelines**

- **Code Style** - Follow existing patterns
- **Testing** - Test new features thoroughly
- **Documentation** - Update README for new features
- **Performance** - Optimize for speed and efficiency

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Leaflet** - Interactive maps
- **Mapbox** - Map tiles and elevation data
- **OpenRouteService** - Route snapping and optimization
- **Font Awesome** - Beautiful icons
- **Vercel** - Hosting and deployment

## 📞 Support

- **Issues** - [GitHub Issues](https://github.com/yourusername/gpx-route-generator/issues)
- **Discussions** - [GitHub Discussions](https://github.com/yourusername/gpx-route-generator/discussions)
- **Email** - support@gpx-route-generator.com

---

**Made with ❤️ for runners, cyclists, and outdoor enthusiasts everywhere** 