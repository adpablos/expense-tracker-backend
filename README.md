# Expense Tracker Backend

This is the backend service for the Expense Tracker application. It provides APIs for managing expenses, categories, and subcategories, and includes features for AI-based expense logging.

## Features

- **Expense Management**: Create, read, update, and delete expenses. Categorize and subcategorize your expenses for better organization.
- **Category and Subcategory Management**: Manage your categories and subcategories to organize your expenses effectively.
- **AI-powered Expense Logging**: Upload images or audio files, and the AI will automatically recognize and log the expense details, making data entry quick and effortless.
- **Comprehensive Documentation**: Detailed API documentation available via Swagger.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/expense-tracker-backend.git
    cd expense-tracker-backend
    ```

2. Install the dependencies:
    ```bash
    npm install
    ```

3. Set up the environment variables:
   Create a `.env` file in the root directory with the following content:
    ```env
    DB_USER=your_db_user
    DB_HOST=your_db_host
    DB_PASSWORD=your_db_password
    DB_PORT=5432
    OPENAI_API_KEY=your_openai_api_key
    ```

4. Initialize the database:
    ```bash
    npm run init-db
    ```

### Running the Server

Start the development server:
```bash
npm run dev
```

The server will be running on http://localhost:3000.

## API Documentation

Swagger documentation is available at: http://localhost:3000/api-docs

## Testing

To run the tests:
```bash
npm run test
```

## Technical Details

- **Node.js** with **Express.js** for the server framework.
- **PostgreSQL** as the database.
- **TypeScript** for type safety.
- **Jest** for unit testing.
- **Swagger** for API documentation.
- **Multer** for handling file uploads.
- **OpenAI API** for processing images and audio files.

### Folder structure
```
├── src
│   ├── __tests__           # Test files
│   ├── config              # Configuration files
│   ├── controllers         # Route handlers
│   ├── models              # Data models
│   ├── routes              # API routes
│   ├── services            # Business logic
│   ├── utils               # Utility functions
│   ├── db.ts               # Database connection
│   ├── app.ts              # Express app setup
│   └── server.ts           # Server startup
├── scripts
│   ├── init-db.sql         # SQL script for creating tables
│   ├── init-db-data.sql    # SQL script for inserting initial data
│   ├── init-db.ts          # Script to initialize the database
│   └── export-openapi.ts   # Script to export OpenAPI specification
├── .env                    # Environment variables
├── package.json            # Project metadata and dependencies
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

### License
This project is licensed under the MIT License. See the LICENSE file for details.

### Contact
For any queries, reach out to [alex@alexdepablos.com](mailto:alex@alexdepablos.com)
