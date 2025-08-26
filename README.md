# Sprite Sheet Slicer

A powerful, client-side web application for slicing sprite sheets into individual tiles. Built with TypeScript, Vite, and modern web technologies, this tool runs entirely in your browser without requiring any server-side processing.

## Features

### Core Functionality
- **Drag & Drop Import**: Simply drag and drop PNG sprite sheets into the application
- **Auto-Detection**: Intelligent tile size detection for uniform grids
- **Manual Configuration**: Fine-tune tile dimensions, margins, spacing, and offsets
- **Real-time Preview**: Live grid overlay with zoom and pan capabilities
- **Batch Export**: Export all tiles as individual PNG files in a ZIP archive

### Advanced Options
- **Transparent Edge Trimming**: Automatically remove transparent borders from tiles
- **Flexible Naming**: Multiple naming patterns (row_col, index, custom prefix)
- **Contact Sheet Generation**: Optional overview image showing all extracted tiles
- **Progress Tracking**: Real-time progress indicators with ETA estimates
- **Settings Persistence**: Automatically saves your preferences in localStorage

### Technical Highlights
- **Offline Capable**: Progressive Web App (PWA) functionality for offline use
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Performance Optimized**: Web Workers and chunked processing for large sprite sheets
- **Accessibility**: Full keyboard navigation and screen reader support
- **Memory Efficient**: Handles large images gracefully with memory management

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with Canvas API support

### Installation

1. **Clone or extract the project**:
   ```bash
   cd sprite-slicer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be available in the `dist/` directory.

## Usage Guide

### Basic Workflow

1. **Import Your Sprite Sheet**
   - Drag and drop a PNG file onto the drop zone, or
   - Click "Choose File" to select a file from your computer
   - The application will display image metadata (dimensions, alpha channel)

2. **Configure Tile Settings**
   - Try the "Auto Detect" feature first for uniform grids
   - Manually adjust tile width and height if needed
   - Set margin (outer padding around the entire sheet)
   - Configure spacing (gutters between individual tiles)
   - Adjust offset X/Y for precise positioning

3. **Preview and Validate**
   - Toggle the grid overlay to visualize tile boundaries
   - Use mouse wheel to zoom, drag to pan the preview
   - Check the tile count display (rows × cols = total)
   - Resolve any validation errors highlighted in red

4. **Export Configuration**
   - Choose naming pattern:
     - `row_col.png`: Files named like `0_0.png`, `0_1.png`
     - `index.png`: Sequential numbering like `0.png`, `1.png`
     - Custom prefix: Add your own prefix like `sprite_0_0.png`
   - Enable "Skip transparent tiles" to exclude empty tiles
   - Enable "Include contact sheet" for a preview image

5. **Export and Download**
   - Click "Export ZIP" to begin processing
   - Monitor progress with the real-time progress bar
   - The ZIP file will automatically download when complete

### Advanced Features

#### Auto-Detection Algorithm
The auto-detection feature analyzes your sprite sheet to identify:
- Consistent tile dimensions
- Transparent gutters between tiles
- Regular grid patterns
- Optimal margin and spacing values

#### Trimming Options
When "Trim transparent edges" is enabled:
- Removes transparent borders from each tile
- Preserves specified padding around trimmed content
- Maintains original tile positioning information
- Reduces file sizes for sprites with excess transparency

#### Contact Sheet
The optional contact sheet provides:
- Grid layout of all extracted tiles
- Tile index numbers for reference
- Configurable background color
- Useful for verification and documentation

## File Structure

```
sprite-slicer/
├── src/
│   ├── main.ts           # Application entry point
│   ├── ui.ts             # Main UI controller
│   ├── imageLoader.ts    # Image loading and metadata
│   ├── grid.ts           # Grid calculation and overlay
│   ├── slicer.ts         # Sprite slicing engine
│   ├── zipper.ts         # ZIP file generation
│   ├── types.d.ts        # TypeScript type definitions
│   ├── style.css         # Application styles
│   └── vite-env.d.ts     # Vite environment types
├── public/
│   ├── manifest.webmanifest  # PWA manifest
│   └── sw.js             # Service worker
├── index.html            # Main HTML file
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── README.md             # This file
└── LICENSE               # MIT License
```

## Technical Architecture

### Core Classes

#### `ImageLoader`
Handles PNG file loading and metadata extraction:
- File validation and error handling
- Canvas-based image processing
- Alpha channel detection
- Memory-efficient image handling

#### `GridCalculator`
Manages grid calculations and validation:
- Tile dimension calculations
- Settings validation with detailed error messages
- Auto-detection algorithms for common sprite sheet formats
- Grid overlay positioning mathematics

#### `SpriteSlicer`
Performs the actual sprite slicing:
- Canvas-based tile extraction
- Transparent edge trimming with configurable padding
- Progress tracking with chunked processing
- Contact sheet generation with customizable layouts

#### `ZipExporter`
Handles ZIP file creation and download:
- JSZip integration for client-side compression
- Configurable naming patterns
- Metadata inclusion (settings, statistics)
- Progress tracking with ETA calculations

#### `UI`
Coordinates the user interface:
- Event handling for all user interactions
- Real-time preview updates with zoom/pan
- Settings persistence in localStorage
- Responsive design with mobile support

### Performance Optimizations

- **Chunked Processing**: Large sprite sheets are processed in chunks to prevent UI blocking
- **Web Workers**: Heavy computations can be offloaded to background threads
- **Memory Management**: Efficient canvas usage and garbage collection
- **Progressive Loading**: Lazy loading of non-critical features
- **Caching**: Service worker caches assets for offline functionality

### Browser Compatibility

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Required APIs**: Canvas 2D, File API, Web Workers, IndexedDB
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Mobile Support**: Touch-friendly interface with responsive design

## Configuration Options

### Tile Settings
- **Tile Width/Height**: Dimensions of individual tiles in pixels
- **Margin**: Outer padding around the entire sprite sheet
- **Spacing**: Gap between adjacent tiles (gutters)
- **Offset X/Y**: Starting position offset for the first tile
- **Trim Transparent**: Remove transparent edges from extracted tiles
- **Preserve Padding**: Padding to maintain around trimmed tiles

### Export Settings
- **Naming Pattern**: How extracted files are named
- **Custom Prefix**: User-defined prefix for custom naming
- **Skip Transparent**: Exclude completely transparent tiles
- **Include Contact Sheet**: Generate overview image of all tiles

### UI Settings (Auto-saved)
- **Grid Overlay**: Toggle grid visualization
- **Zoom Level**: Preview magnification
- **Pan Position**: Preview viewport position
- **Last Used Settings**: All configuration values

## Troubleshooting

### Common Issues

**"Only PNG files are supported"**
- Ensure your file has a `.png` extension
- Convert other formats (JPG, GIF, etc.) to PNG first
- Check that the file isn't corrupted

**"Image width/height is too small for current settings"**
- Reduce tile dimensions
- Decrease margin and spacing values
- Check that your sprite sheet is large enough

**Auto-detection fails**
- Try manual configuration instead
- Ensure your sprite sheet has consistent spacing
- Check for irregular tile arrangements

**Export takes too long**
- Reduce tile count by adjusting settings
- Enable "Skip transparent tiles" option
- Close other browser tabs to free memory

**ZIP download doesn't start**
- Check browser popup/download blockers
- Ensure sufficient disk space
- Try refreshing the page and re-exporting

### Performance Tips

- **Large Sprite Sheets**: Use smaller preview zoom levels
- **Many Tiles**: Enable transparent tile skipping
- **Memory Issues**: Close other applications and browser tabs
- **Slow Processing**: Consider breaking large sheets into smaller sections

## Development

### Scripts
- `npm run dev`: Start development server with hot reload
- `npm run build`: Create production build
- `npm run preview`: Preview production build locally
- `npm run lint`: Run ESLint code analysis

### Dependencies
- **Runtime**: JSZip, FileSaver.js
- **Development**: Vite, TypeScript, ESLint
- **Types**: @types/file-saver

### Contributing
This is a standalone application. For modifications:
1. Fork the project
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Browser Support

### Minimum Requirements
- Canvas 2D Context support
- File API for drag & drop
- Blob and URL APIs for downloads
- ES2018+ JavaScript features

### Recommended Features
- Web Workers for background processing
- Service Workers for offline functionality
- IndexedDB for settings persistence
- Touch events for mobile support

## Security Considerations

- **Client-Side Only**: No data is sent to external servers
- **Local Processing**: All operations happen in your browser
- **No Tracking**: No analytics or user tracking
- **Offline Capable**: Works without internet connection after initial load

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Vite](https://vitejs.dev/) for fast development and building
- Uses [JSZip](https://stuk.github.io/jszip/) for client-side ZIP creation
- Powered by [FileSaver.js](https://github.com/eligrey/FileSaver.js/) for downloads
- Styled with modern CSS Grid and Flexbox layouts

---

**Sprite Sheet Slicer** - Efficient, offline sprite sheet processing in your browser.

