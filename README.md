# VolunteerHub - Volunteer Platform

A modern volunteer platform built with Next.js 14, TypeScript, and Tailwind CSS. Similar to Better Impact, this platform connects volunteers with meaningful opportunities in their community.

## Features

### Frontend
- Browse volunteer opportunities by category and location
- Discover nonprofit organizations
- Responsive design that works on all devices
- Server-side rendering with Next.js App Router
- Built with TypeScript for type safety
- Styled with Tailwind CSS v4

### Backend
- RESTful API with Next.js API Routes
- MongoDB database with Mongoose ODM
- Complete CRUD operations for Users, Organizations, Opportunities, and Applications
- Password hashing with bcrypt
- Data validation and error handling
- Pagination and filtering support

## Pages

- **Home** - Landing page with call-to-action and feature highlights
- **Opportunities** - Browse and search volunteer opportunities
- **Organizations** - Discover nonprofit organizations
- **About** - Learn about the platform and its mission

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- MongoDB (local installation or MongoDB Atlas account)

### Installation

1. Install frontend dependencies:
```bash
cd frontend
npm install
```

2. Set up backend environment variables:
```bash
cd ../backend
# Copy .env.local.example to .env.local
cp .env.local.example .env.local
# Edit .env.local and update MONGODB_URI with your MongoDB connection string
```

```bash
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/volunteer-platform

# For MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/volunteer-platform
```

3. Run the development server:
```bash
cd ../frontend
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

### Frontend
Run these from the `frontend/` directory:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Font:** Inter (Google Fonts)

### Backend
- **API:** Next.js API Routes
- **Database:** MongoDB
- **ODM:** Mongoose
- **Authentication:** bcrypt for password hashing

## Project Structure

This is a monorepo with separated frontend and backend:

```
volunteer-platform/
├── frontend/                      # Next.js Frontend Application
│   ├── app/                      # Next.js app directory
│   │   ├── api/                 # API routes (calls backend)
│   │   │   ├── users/          # User endpoints
│   │   │   ├── opportunities/  # Opportunity endpoints
│   │   │   ├── organizations/  # Organization endpoints
│   │   │   └── applications/   # Application endpoints
│   │   ├── about/              # About page
│   │   ├── opportunities/      # Opportunities page
│   │   ├── organizations/      # Organizations page
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   ├── components/             # Reusable components
│   │   ├── Navigation.tsx      # Navigation bar
│   │   └── Footer.tsx          # Footer component
│   ├── public/                 # Static assets
│   ├── package.json            # Frontend dependencies
│   ├── tsconfig.json           # TypeScript config
│   └── next.config.ts          # Next.js config
│
├── backend/                      # Backend Logic & Data Layer
│   ├── lib/                     # Library code
│   │   ├── db/                 # Database utilities
│   │   │   └── mongodb.ts      # MongoDB connection
│   │   └── models/             # Mongoose models
│   │       ├── User.ts         # User model
│   │       ├── Organization.ts # Organization model
│   │       ├── Opportunity.ts  # Opportunity model
│   │       └── Application.ts  # Application model
│   ├── .env.local              # Environment variables (not in git)
│   ├── .env.local.example      # Environment template
│   ├── API_DOCUMENTATION.md    # API documentation
│   └── BACKEND_SETUP.md        # Backend setup guide
│
└── README.md                     # This file
```

## API Endpoints

The backend provides RESTful API endpoints for all core functionality. See [backend/API_DOCUMENTATION.md](./backend/API_DOCUMENTATION.md) for detailed documentation.

### Available Endpoints:
- **Users:** `/api/users` - User management (CRUD)
- **Organizations:** `/api/organizations` - Organization management (CRUD)
- **Opportunities:** `/api/opportunities` - Volunteer opportunities (CRUD)
- **Applications:** `/api/applications` - Volunteer applications (CRUD)

All endpoints support pagination, filtering, and search functionality.

## Database Models

### User
Stores volunteer and organization admin accounts with authentication, profile info, skills, and interests.

### Organization
Nonprofit organizations offering volunteer opportunities, with verification status and contact details.

### Opportunity
Volunteer opportunities with scheduling, location, requirements, and capacity tracking.

### Application
Tracks volunteer applications to opportunities with status, reviews, and hour tracking.

## Future Enhancements

- JWT-based authentication and authorization
- Email notifications for applications and updates
- Image upload for profiles and organizations
- Advanced search with geolocation
- Calendar integration for scheduling
- Volunteer hour tracking and certificates
- Reviews and ratings system
- Admin dashboard
- Real-time notifications

## License

MIT
