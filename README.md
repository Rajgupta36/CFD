# CFD Platform

## Demo Video

https://github.com/user-attachments/assets/ba1a7774-9f39-45d5-bc84-4d497d6b75a7

## Architecture

<img width="3053" height="1930" alt="Untitled-2025-09-24-1312" src="https://github.com/user-attachments/assets/fcd341a6-e6f2-4dcb-9da4-c729d1eec873" />



## Description

This is a CFD (Contract for Difference) trading platform designed for real-time market interactions. It features a high-performance **Rust engine** for critical calculations, **TypeScript-based microservices** for real-time data polling and WebSocket communication, and a dynamic **React frontend** for user interaction. The platform leverages Redis Streams for efficient event handling to ensure live and accurate data updates.

## Features

- **Trading Core:** A powerful Rust engine handles core CFD logic and high-speed data processing.
- **Real-time Data:** Get live market updates through WebSockets and a dedicated polling mechanism.
- **Event Streaming:** Uses Redis Streams for reliable and ordered processing of market events.
- **API Services:** A Node.js backend provides all necessary API endpoints and manages data.
- **Email Alerts:** An integrated mailing service sends automated notifications.
- **User Interface:** A modern React application allows users to interact with the platform.

## Technologies Used

- **Backend:** Node.js (e.g., Express.js)
- **Frontend:** React.js
- **Engine:** Rust
- **Mailing:** Node.js (e.g., Nodemailer)
- **Polling Server:** TypeScript, Node.js, Redis (for Redis Streams)
- **Websocket:** TypeScript, Node.js (e.g., `ws` or `Socket.IO`)
- **Database:** [Specify your database, e.g., PostgreSQL, MongoDB, Redis for caching]

## Installation

To get a local copy of this project running, follow these simple steps.

### Prerequisites

Make sure you have these installed on your computer:

- Node.js (LTS version recommended)
- npm or Yarn
- Rust and Cargo (`rustup install stable`)
- TypeScript (you might need to install globally: `npm install -g typescript`)
- Redis Server (version 5.0 or newer for Redis Streams)
- Git


### Setup

1. **Clone the project:**

    ```bash
    git clone https://github.com/your_username/project-202.git
    cd project-202
    ```

2. **Start all services:**

    ```bash
    docker-compose up
    ```

    _This will build and start the backend, frontend, Rust engine, mailing service, polling server, and WebSocket server automatically._

---

### Configuration

Each part of the project may need specific settings (like database connections, API keys, Redis details, email credentials). Look for a `.env.example` file or a `README.md` inside each sub-directory for more information.

## How to Use

Once all services are running, the frontend application will connect to the backend and WebSocket services. The Rust engine, Polling Server, and Mailing service will work in the background, handling data, real-time events from Redis Streams, and sending emails.

- Open the frontend application in your browser at `http://localhost:5173` (usually 3000 or 5173).
- Use the application to see real-time updates and how data is processed.

## Contributing

We welcome contributions to make this project even better!

If you have an idea, please fork the repository and create a pull request. You can also open an issue with the tag "enhancement".
Don't forget to give the project a star! Thank you!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

