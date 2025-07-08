# Artillery Performance Dashboard

A modern, responsive web application for visualizing and analyzing Artillery.io load test results. Built with Next.js 15, TypeScript, and Tailwind CSS.

![Artillery Dashboard](https://img.shields.io/badge/Artillery-Performance%20Dashboard-orange) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC)

## ✨ Features

### 📊 **Intelligent Test Detection**
- Automatically detects and adapts to both traditional HTTP and browser automation Artillery tests
- Context-aware metrics and visualizations based on test type

### 📈 **Comprehensive Dashboards**
- **Key Metrics Summary**: Virtual user statistics, request metrics, and performance percentiles
- **Performance Charts**: Time-series visualizations for request rates, response times, and Core Web Vitals
- **Browser Metrics**: TTFB, FCP (First Contentful Paint), and LCP (Largest Contentful Paint) when available
- **Additional Panels**: Histogram distributions and status code breakdowns

### 🎯 **Performance Analysis**
- **Apdex Rating**: Automated performance scoring with context-aware thresholds
- **Pass/Fail Indicators**: Instant test result assessment
- **Percentile Analysis**: P50, P95, P99 performance breakdowns
- **Adaptive Thresholds**: Different performance criteria for HTTP vs browser tests

### 🎨 **Modern UI/UX**
- Dark mode optimized interface
- Responsive design for desktop and mobile
- Drag & drop JSON file upload
- Accessible design with proper color contrast

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JulianKingman/artillery-load-test-results-viewer.git
   cd artillery-load-test-results-viewer
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📖 Usage

### Loading Test Results

1. **Generate Artillery Results**
   Run your Artillery test with JSON output:
   ```bash
   artillery run your-test.yml --output results.json
   ```

2. **Upload to Dashboard**
   - Drag and drop your `results.json` file onto the upload area
   - Or click to browse and select your results file

3. **Analyze Performance**
   - View key metrics in the summary cards
   - Examine time-series charts for performance trends
   - Check Apdex rating and pass/fail status
   - Explore detailed breakdowns in additional panels

### Supported Test Types

#### Traditional HTTP Tests
- Request rate and response time metrics
- HTTP status code analysis
- Standard performance thresholds

#### Browser Automation Tests
- Core Web Vitals (FCP, LCP, TTFB)
- Page performance metrics
- Browser-specific status codes
- Optimized thresholds for browser metrics

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **UI Components**: Custom components with shadcn/ui patterns
- **File Handling**: HTML5 File API with drag & drop

## 📁 Project Structure

```
src/
├── app/                   # Next.js app router
│   ├── globals.css       # Global styles and CSS variables
│   ├── layout.tsx        # Root layout component
│   └── page.tsx          # Home page with file upload
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── Dashboard.tsx    # Main dashboard layout
│   ├── KeyMetricsSummary.tsx    # Performance metrics cards
│   ├── ChartsSection.tsx        # Time-series charts
│   └── AdditionalPanels.tsx     # Histograms and breakdowns
├── lib/
│   └── utils.ts         # Utility functions
└── types/
    └── artillery.ts     # TypeScript type definitions
```

## 🎨 Customization

### Themes
The dashboard uses CSS custom properties for theming. Dark mode variables are configured in `src/app/globals.css`.

### Performance Thresholds
Apdex and pass/fail thresholds can be adjusted in:
- `src/components/KeyMetricsSummary.tsx` - Summary card thresholds
- Context-aware thresholds automatically adjust for HTTP vs browser tests

### Charts
Chart configurations and styling can be modified in `src/components/ChartsSection.tsx`.

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy with zero configuration

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Docker containers
- Static hosting (with `next export`)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Roadmap

- [ ] Real-time test monitoring
- [ ] Historical test comparison
- [ ] Custom performance alerts
- [ ] Export capabilities (PDF, PNG)
- [ ] Multiple file upload and comparison
- [ ] Advanced filtering and search

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Artillery.io](https://artillery.io) for the excellent load testing framework
- [Next.js](https://nextjs.org) for the React framework
- [Recharts](https://recharts.org) for the charting library
- [Tailwind CSS](https://tailwindcss.com) for the utility-first CSS framework

---

**Built with ❤️ for the Artillery.io community**
