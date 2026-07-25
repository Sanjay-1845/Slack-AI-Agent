# Slack AI Agent

A Node.js-based Slack bot that automatically analyzes new community members and posts a fit assessment to a private Slack channel using AI. The project combines Slack event handling, OpenAI-based analysis, and persistent storage to help teams identify promising members for outreach and engagement.

## Project Overview

The Slack AI Agent listens for Slack membership events such as:

- new users joining the workspace
- users joining specific channels

When a member is detected, the bot:

1. gathers basic profile information from Slack
2. performs lightweight external research (company and GitHub context when available)
3. sends the data to an AI model for analysis
4. stores the result in a PostgreSQL database
5. posts a structured summary to a private Slack channel

## Features

- Slack event-driven automation using Slack Bolt
- AI-powered member analysis with OpenAI
- PostgreSQL persistence for storing analysis results
- Express health endpoint for monitoring
- Render-friendly deployment setup
- Optional local testing endpoint for manual analysis

## Tech Stack

- Node.js
- Express.js
- Slack Bolt
- Slack Web API
- OpenAI / LangChain
- PostgreSQL
- Axios
- dotenv

## Project Structure

```text
.
├── db.js              # PostgreSQL connection and database helpers
├── index.js           # Main Slack bot logic, event handlers, and AI flow
├── package.json       # Project dependencies and scripts
├── .env.example       # Environment variable template
└── README.md          # Project documentation
```

## Prerequisites

Before running the project locally, make sure you have:

- Node.js installed
- A Slack workspace with a bot token and app token
- An OpenAI API key
- A PostgreSQL database

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a local environment file:

```bash
cp .env.example .env
```

4. Update the environment variables in `.env` with your real credentials.

## Environment Variables

Use the following variables in your `.env` file:

```env
SLACK_BOT_TOKEN=your-slack-bot-token
SLACK_APP_TOKEN=your-slack-app-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_PRIVATE_CHANNEL_ID=your-private-channel-id
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=your-postgresql-connection-string
COMPANY_NAME=Your Company Name
COMPANY_PRODUCT=Your Product Name
NODE_ENV=development
PORT=3000
```

## Running Locally

Start the app:

```bash
npm start
```

For development mode with auto-reload:

```bash
npm run dev
```

The app exposes a health check endpoint at:

```text
GET /health
```

A test endpoint is also available in development mode:

```text
POST /test/analyze-member
```

## Deployment on Render

This project is suitable for deployment on Render as a Node.js web service.

### Render Setup Steps

1. Create a new Web Service on Render
2. Connect this GitHub repository
3. Use the following settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add all environment variables from your `.env` file in Render's Environment section
5. Create or attach a PostgreSQL database in Render and set `DATABASE_URL` to the database connection string

### Render Notes

- Render will inject the `PORT` variable automatically, so the app should use `process.env.PORT` as configured in the code.
- The app uses Slack Socket Mode, so your Slack app must be configured with Socket Mode enabled and the correct app token.
- The bot should be deployed with a stable public URL if your Slack app requires it for callbacks or webhooks.

## Database Behavior

The bot stores each analysis in a PostgreSQL table named `member_analyses` with fields such as:

- member identity and role information
- fit score
- AI-generated insights
- recommendations
- research data
- Slack delivery status

## Example Use Case

A community team can use this agent to automatically evaluate new members and identify the ones most likely to be interested in a commercial product, making onboarding and outreach more targeted.

## Future Improvements

Possible enhancements for the project include:

- richer research sources
- support for more Slack events
- improved prompt engineering for better AI scoring
- dashboard or admin UI for reviewing analyses
- better error handling and retry logic

