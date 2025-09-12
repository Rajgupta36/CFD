# Trade Notification Service

A service that listens to Redis stream channel-2 for closed trade notifications, stores them in the database, and sends email notifications to users.

## Features

- 📡 Listens to Redis stream `channel-2` for closed trade responses
- 💾 Automatically stores successful closed trades in PostgreSQL database
- 📧 Sends beautiful HTML email notifications to users when trades are closed
- 🔄 Handles reconnections and error recovery
- 📊 Detailed logging and monitoring

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   - `DATABASE_URL`: PostgreSQL connection string
   - `REDIS_URL`: Redis connection string  
   - `MAIL_SECRET`: Resend API key for sending emails

3. **Set up database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Start the service:**
   ```bash
   npm start
   ```
   
   For development:
   ```bash
   npm run dev
   ```

## How it works

1. **Stream Processing**: The service connects to Redis and continuously reads from `channel-2` stream
2. **Trade Detection**: It filters for `CloseOrder` responses with successful status
3. **Database Storage**: Successful trades are stored in the `ClosedOrder` table with user and asset relationships
4. **Email Notifications**: Users receive detailed email notifications with trade summary, P&L, and formatted data

## Email Template

The service sends rich HTML emails containing:
- Trade summary (asset, type, quantity, leverage)
- Entry and exit prices
- Profit/Loss with color coding
- Trade timestamp and order ID

## Error Handling

- Graceful handling of Redis disconnections
- Database transaction rollbacks on errors
- Email delivery failure logging
- Service continues running even if individual messages fail

## Monitoring

The service logs all activities including:
- ✅ Successful trade processing
- ⚠️ Partial failures (DB save vs email)
- ❌ Errors with detailed context
- 🔍 Non-trade messages for debugging

## Architecture

```
Redis Stream (channel-2) 
    ↓
Trade Notification Service
    ↓
┌─────────────┬─────────────┐
│  Database   │    Email    │
│   Storage   │    Service  │
└─────────────┴─────────────┘
```

The service processes each closed trade message and performs both database storage and email notification in parallel for optimal performance.
