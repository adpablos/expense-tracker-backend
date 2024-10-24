Expense Tracker Backend
=======================

This is the backend service for the Expense Tracker application. It provides APIs for managing expenses, categories, subcategories, and includes features for AI-based expense logging.

Features
--------

-   **Expense Management**: Create, read, update, and delete expenses. Categorize and subcategorize your expenses for better organization.
-   **Category and Subcategory Management**: Manage your categories and subcategories to organize your expenses effectively.
-   **AI-powered Expense Logging**: Upload images or audio files, and the AI will automatically recognize and log the expense details, making data entry quick and effortless.
-   **Multi-Household Support**: Manage expenses across different households with role-based access.
-   **Comprehensive Documentation**: Detailed API documentation available via Swagger.

Table of Contents
-----------------

-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
    -   [Configuration](#configuration)
    -   [Database Initialization](#database-initialization)
-   [Running the Server](#running-the-server)
    -   [Development](#development)
    -   [Production](#production)
-   [Testing](#testing)
-   [API Documentation](#api-documentation)
-   [Technical Details](#technical-details)
    -   [Folder Structure](#folder-structure)
-   [Development Notes](#development-notes)
-   [Troubleshooting](#troubleshooting)
-   [License](#license)
-   [Contact](#contact)

Getting Started
---------------

### Prerequisites

-   **Node.js** (v14 or higher)
-   **npm** (v6 or higher)
-   **PostgreSQL** (v12 or higher)
-   **Docker** (for integration tests)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/yourusername/expense-tracker-backend.git
    cd expense-tracker-backend
    ```

2.  **Install the dependencies:**

    ```bash
    npm install
    ```

### Configuration

1.  **Set up environment variables:**

    Create a `.env` file in the root directory with the following content:

    ```env
    DB_USER=your_db_user
    DB_HOST=your_db_host
    DB_PASSWORD=your_db_password
    DB_PORT=5432
    DB_NAME=your_db_name
    OPENAI_API_KEY=your_openai_api_key
    ```

    Replace the placeholders with your actual database credentials and OpenAI API key.

2.  **Configure TypeScript:**

    Ensure that your `tsconfig.json` is correctly configured. The project uses a `global.d.ts` file located in `src/types` for extending global interfaces.

### Database Initialization

1.  **Create the database:**

    Ensure that PostgreSQL is running and create a new database for the application.

2.  **Initialize the database schema:**

    ```bash
    npm run init-db
    ```

    This script will run the SQL scripts located in the `scripts/sql` directory to create tables and insert initial data.

Running the Server
------------------

### Development

To start the development server with hot reloading:

bash

Copy code

`npm run dev`

**Note:** The development server uses `ts-node` with the `--files` option to include all necessary type definitions, especially those in `src/types/global.d.ts`. This ensures that custom type extensions are recognized during runtime.

The server will be running at <http://localhost:3000>.

### Production

To build and start the server for production:

1.  **Build the project:**

    ```bash
    npm run build
    ```

2.  **Start the server:**

    ```bash
    npm start
    ```

Testing
-------

To run the tests:

bash

Copy code

`npm run test`


This will execute all unit and integration tests using Jest.

API Documentation
-----------------

Swagger documentation is available at: <http://localhost:3000/api-docs>

Technical Details
-----------------

-   **Node.js** with **Express.js** for the server framework.
-   **TypeScript** for static typing.
-   **PostgreSQL** as the relational database.
-   **Jest** and **Supertest** for testing.
-   **Swagger** for API documentation.
-   **Multer** for handling file uploads.
-   **OpenAI API** for processing images and audio files.
-   **InversifyJS** for dependency injection.
-   **ts-node** for running TypeScript directly.

### Folder Structure


bash

Copy code

`├── README.md                         # Project documentation
├── config                            # Configuration files
│   ├── jest.config.base.ts           # Base Jest configuration
│   ├── jest.integration.config.ts    # Jest configuration for integration tests
│   ├── jest.unit.config.ts           # Jest configuration for unit tests
│   ├── tsconfig.json                 # TypeScript configuration
│   └── tsconfig.test.json            # TypeScript configuration for tests
├── global.d.ts                       # Global type definitions
├── openapi.json                      # OpenAPI specification
├── package-lock.json                 # Lockfile for npm dependencies
├── package.json                      # Project metadata and dependencies
├── scripts                           # Utility scripts
│   ├── debug-env.ts                  # Script for debugging environment variables
│   ├── export-openapi.ts             # Script to export OpenAPI specification
│   ├── init-db.ts                    # Script to initialize the database
│   ├── migrate-expenses.ts           # Script to migrate expenses
│   ├── prepare-production-db.ts      # Script to prepare the production database
│   └── sql                           # SQL scripts
│       ├── init-db-data.sql          # SQL script for inserting initial data
│       └── init-db.sql               # SQL script for creating tables
├── src                               # Source code
│   ├── app.ts                        # Express app setup
│   ├── config                        # Configuration files
│   ├── constants.ts                  # Application constants
│   ├── controllers                   # Route handlers
│   ├── middleware                    # Express middleware
│   ├── models                        # Data models
│   ├── repositories                  # Data access logic
│   ├── routes                        # API routes
│   ├── server.ts                     # Server setup
│   ├── services                      # Business logic
│   ├── swagger.ts                    # Swagger configuration
│   ├── transaction-coordinators      # Transaction coordination
│   └── utils                         # Utility functions
├── tests                             # Test files
│   ├── config                        # Test configuration
│   ├── integration                   # Integration tests
│   ├── unit                          # Unit tests
│   └── utils                         # Test utilities`


Development Notes
-----------------

-   **TypeScript Configuration:**

    The project uses a `global.d.ts` file located in `src/types` to extend global interfaces, such as adding custom properties to the Express `Request` interface. This file is included in the TypeScript compilation through the `include` array in `tsconfig.json`.

-   **Running with `ts-node`:**

    When running the development server using `ts-node`, it's important to include the `--files` flag in the script to ensure that all files specified in `tsconfig.json` (including `src/types/global.d.ts`) are loaded. This is configured in the `package.json` scripts:

    ```json
    "scripts": {
      "dev": "ts-node --files src/index.ts"
    }
    ```

    Without the `--files` flag, `ts-node` does not load the type definitions specified in the `include` array of `tsconfig.json`, which can lead to compilation errors when using custom type extensions.

-   **Dependency Injection with InversifyJS:**

    The project utilizes InversifyJS for managing dependencies and inversion of control. All services, controllers, and repositories are set up with dependency injection for better modularity and testability.

-   **Error Handling and Logging:**

    Custom middleware is implemented for centralized error handling and request/response logging. The logging system is configurable and can be extended as needed.

-   **AI Integration:**

    The integration with the OpenAI API allows the application to process images and audio files for expense logging. Ensure that the `OPENAI_API_KEY` environment variable is set correctly.

Troubleshooting
---------------

- **Port Conflicts**: If you encounter a "port is already allocated" error when running Docker, ensure no other services are using the same port or change the port in `docker-compose.test.yml`.

- **Docker Issues**: Ensure Docker is running and properly configured. Use `docker info` to check the status and resolve any plugin issues.

License
-------

This project is licensed under the MIT License. See the <LICENSE> file for details.

Contact
-------

For any queries or contributions, please reach out to <alex@alexdepablos.com>.