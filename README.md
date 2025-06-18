# Vodka - Modern Messaging Application

Vodka is a modern real-time messaging application built with Next.js, similar to Zalo, that enables users to connect, chat, and share moments with friends and family.

## Features

- 💬 Real-time messaging with WebSocket
- 👥 User authentication and profile management
  - QR code login
  - Traditional form login
- 🔍 Advanced search functionality
  - Friend search
  - Message search
- 🤖 AI-powered assistance
  - Email composition
  - Smart replies
  - Content suggestions
- 🎨 Modern UI with Shadcn UI and Tailwind CSS
- 🔒 Secure communication with JWT authentication
- 🌐 Server-side rendering for optimal performance
- ⚙️ Comprehensive settings management
  - Email updates
  - Phone number changes
  - Password management

## Screenshots

### Landing Page

![Landing Page Screenshot](/public/screenshots/landing.jpg)
_Welcome page showcasing Vodka's features and benefits_

### Authentication

![QR Login Screenshot](/public/screenshots/qr-login.jpg)
_QR code-based login for quick access_

![Form Login Screenshot](/public/screenshots/form-login.jpg)
_Traditional login form with email/password_

### Chat Interface

![Chat Interface Screenshot](/public/screenshots/chat.jpg)
_Real-time messaging interface with message history and AI suggestions_

### Friend List & Search

![Friend List Screenshot](/public/screenshots/friend.jpg)
_Manage connections and search for new friends_

### AI Assistant

![AI Assistant Screenshot](/public/screenshots/ai-assistant.jpg)
_AI-powered features for email composition and smart replies_

### Settings

![Settings Screenshot](/public/screenshots/settings.jpg)
_Comprehensive settings panel for account management_

### Profile

![Profile Screenshot](/public/screenshots/profile.jpg)
_User profile management and settings_

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI Components:** Shadcn UI, Radix UI
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Real-time Communication:** Socket.io
- **Authentication:** JWT
- **Form Handling:** React Hook Form
- **API Integration:** Server Actions

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

1. Clone the repository:

```bash
git clone [your-repository-url]
cd bond-hub-fe
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add necessary environment variables:

```env
NEXT_PUBLIC_API_URL=your_api_url
NEXT_PUBLIC_WS_URL=your_websocket_url
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries and configurations
├── providers/       # React context providers
├── services/        # API and external service integrations
├── stores/          # Zustand state management
├── types/           # TypeScript type definitions
└── utils/           # Helper functions and utilities
```

## Development

- Use `npm run lint` to run ESLint
- Use `npm run type-check` to run TypeScript type checking
- Use `npm run build` to create a production build

## Deployment

The application requires a Node.js environment with WebSocket support. You can deploy it on any platform that supports WebSocket connections, such as:

- DigitalOcean
- AWS (EC2, ECS)
- Google Cloud Platform
- Heroku
- Railway
- Custom VPS

Make sure your chosen platform supports:

- WebSocket connections
- Node.js runtime
- SSL certificates for secure connections

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
