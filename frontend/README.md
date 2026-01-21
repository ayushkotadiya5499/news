# AI News Intelligence Frontend

A modern React/Next.js frontend for the AI News Intelligence Backend.

## Features

- **Dashboard**: Real-time analytics with charts showing article trends, categories, top tags, and sources
- **Articles Browser**: Paginated article listing with filtering by category, source, and processing status
- **Article Detail**: Full article view with AI-generated summary and tags, option to process unprocessed articles
- **Search**: Full-text search with filters for category, source, tag, and date range, plus autocomplete suggestions

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** for styling
- **Recharts** for charts and visualizations
- **React Hot Toast** for notifications

## Prerequisites

- Node.js 18+ installed
- Backend running at `http://localhost:8000` (see main project README)

## Quick Start

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

Create a `.env.local` file (or copy from `.env.example`):

```env
# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with sidebar and header
│   ├── page.tsx            # Dashboard page
│   ├── articles/
│   │   ├── page.tsx        # Articles list
│   │   └── [id]/page.tsx   # Article detail
│   └── search/
│       └── page.tsx        # Search page
├── components/
│   ├── layout/             # Layout components (Sidebar, Header)
│   ├── dashboard/          # Dashboard widgets (StatCard, Charts)
│   └── articles/           # Article components (ArticleCard, Filters, etc.)
├── lib/
│   ├── api.ts              # API client for backend
│   └── utils.ts            # Utility functions
└── types/
    └── api.ts              # TypeScript interfaces matching backend schemas
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## API Endpoints Used

The frontend consumes these backend endpoints:

### News
- `GET /api/news/` - List articles (paginated)
- `GET /api/news/{id}` - Get article detail
- `POST /api/news/fetch` - Fetch news from external API
- `POST /api/news/{id}/process` - Process single article
- `GET /api/news/categories` - List categories
- `GET /api/news/sources` - List sources

### Search
- `GET /api/search/` - Search articles
- `GET /api/search/tags` - List all tags
- `GET /api/search/tags/popular` - Popular tags with counts
- `GET /api/search/suggestions` - Autocomplete suggestions

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/analytics` - Full analytics bundle
- `GET /api/admin/tags/top` - Top tags
- `GET /api/admin/categories` - Category stats
- `GET /api/admin/sources` - Source stats
- `GET /api/admin/articles-per-day` - Daily article counts
- `POST /api/admin/trigger-fetch` - Trigger news fetch
- `POST /api/admin/trigger-processing` - Trigger article processing

## Screenshots

### Dashboard
Shows key metrics, articles per day chart, category distribution, top tags, and sources.

### Articles Browser
Filterable list of articles with status indicators and tag chips.

### Search
Full-text search with filters, popular tags, and autocomplete suggestions.

## Development Notes

- The frontend assumes no authentication is required (backend auth was removed)
- All API calls include proper error handling with toast notifications
- Charts are responsive and adapt to container size
- Pagination is implemented for both articles list and search results
