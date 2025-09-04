# FormReview

A minimal Express.js project scaffold with a clean architecture layout.

## Structure

```
FormReview
├── src
│   ├── config          # Configuration files (e.g., database, environment variables)
│   ├── controllers     # Handles requests/responses
│   ├── entities        # Database models & schemas
│   ├── routes          # API route definitions
│   ├── middlewares     # Custom middleware (auth, logging, error handling)
│   ├── services        # Business logic or external API interactions
│   ├── utils           # Helper functions
│   ├── app.js          # Express app setup
│   └── server.js       # Server initialization
├── .env                # Environment variables
├── .gitignore          # Files to ignore in version control
├── package.json        # Dependencies and scripts
└── README.md           # Project documentation
```

## Quick start

1. Install dependencies
2. Run the dev server

### Scripts

- `npm run dev` - Start with nodemon (auto-reload)
- `npm start` - Start production server
- `npm test` - Run tests (placeholder)

### Try it

- Health check: GET `http://localhost:3000/health`
- Sample route: GET `http://localhost:3000/api/sample?name=Alice`

## Notes

- Customize environment variables in `.env`.
- Add database models in `src/entities`.
- Add new routers under `src/routes` and mount in `src/routes/index.js`.
