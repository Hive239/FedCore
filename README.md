# FedCore

A modern property management platform built with Next.js, TypeScript, and Supabase.

## Features

- **Multi-tenant Architecture**: Secure data isolation for different property management companies
- **Project Management**: Track renovation and maintenance projects with status, budget, and timeline
- **Task Management**: Kanban board with drag-and-drop functionality for task organization
- **Vendor Directory**: Manage contractors and service providers with ratings and categories
- **Document Management**: Store and organize important documents with version control
- **Calendar Integration**: Schedule events, meetings, and maintenance activities
- **Real-time Updates**: Live notifications and messaging between team members
- **Association Management**: Manage multiple properties, HOAs, and condominium associations

## Tech Stack

- **Frontend**: Next.js 15+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form with Zod validation
- **Drag & Drop**: @dnd-kit
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/FedCore.git
   cd FedCore
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. Set up the database:
   Follow the instructions in `DATABASE_SETUP.md` to create the schema and test data.

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
project-pro-app/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── (dashboard)/     # Authenticated pages
│   │   ├── login/           # Authentication pages
│   │   └── layout.tsx       # Root layout
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   └── ...              # Feature components
│   ├── lib/                 # Utilities and helpers
│   │   ├── supabase/        # Supabase client
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils.ts         # Utility functions
│   └── middleware.ts        # Next.js middleware
├── supabase/                # Database schemas and migrations
├── scripts/                 # Setup and utility scripts
└── public/                  # Static assets
```

## Development

### Database Schema

The application uses a multi-tenant architecture with Row Level Security (RLS) policies. Key tables include:

- `tenants` - Property management companies
- `projects` - Renovation and maintenance projects
- `tasks` - Individual tasks within projects
- `vendors` - Service providers and contractors
- `documents` - File storage and management
- `associations` - Properties/HOAs being managed

### Authentication

Authentication is handled by Supabase Auth. Users are automatically associated with a tenant upon signup or invitation.

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@projectpro.com or open an issue in this repository.