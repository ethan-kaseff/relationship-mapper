#!/bin/bash
set -e

echo "🚀 JCRB Relationship Mapper - Vercel Setup"
echo "==========================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "Please log in to Vercel:"
    vercel login
fi

echo ""
echo "📁 Linking project to Vercel..."
vercel link

echo ""
echo "🗄️  Setting up Vercel Postgres database..."
echo ""
echo "⚠️  IMPORTANT: You need to create the database in Vercel Dashboard:"
echo ""
echo "   1. Go to: https://vercel.com/dashboard"
echo "   2. Select your project"
echo "   3. Go to 'Storage' tab"
echo "   4. Click 'Create Database' → 'Postgres'"
echo "   5. Name it 'jcrb-db' and click 'Create'"
echo ""
read -p "Press Enter once you've created the database..."

echo ""
echo "⬇️  Pulling environment variables from Vercel..."
vercel env pull .env.local

# Generate and set NEXTAUTH_SECRET if not already set
echo ""
echo "🔑 Setting up NextAuth..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Check if NEXTAUTH_SECRET exists
if ! grep -q "NEXTAUTH_SECRET" .env.local 2>/dev/null; then
    echo "Setting NEXTAUTH_SECRET..."
    echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production
    echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET preview
    echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET development
fi

# Get the project URL and set NEXTAUTH_URL
echo ""
echo "🌐 Setting NEXTAUTH_URL..."
PROJECT_URL=$(vercel inspect 2>/dev/null | grep -o 'https://[^"]*\.vercel\.app' | head -1 || echo "")
if [ -n "$PROJECT_URL" ]; then
    echo "$PROJECT_URL" | vercel env add NEXTAUTH_URL production
    echo "$PROJECT_URL" | vercel env add NEXTAUTH_URL preview
    echo "http://localhost:3000" | vercel env add NEXTAUTH_URL development
else
    echo "⚠️  Could not detect project URL. Please set NEXTAUTH_URL manually in Vercel dashboard."
fi

# Pull env vars again to get the new ones
echo ""
echo "⬇️  Pulling updated environment variables..."
vercel env pull .env.local --yes

echo ""
echo "🗃️  Pushing database schema..."
npx prisma db push

echo ""
echo "🌱 Seeding database..."
npm run db:seed

echo ""
echo "🚀 Deploying to production..."
vercel --prod

echo ""
echo "✅ Setup complete!"
echo ""
echo "Your app is now live! Check the URL above."
echo ""
echo "Default admin login:"
echo "  Email: admin@jcrb.org"
echo "  Password: (shown during seed above)"
echo ""
echo "To develop locally, run: npm run dev"
