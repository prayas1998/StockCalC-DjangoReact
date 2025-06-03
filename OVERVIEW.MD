# TradeSmart - Stock Market Charges Calculator

## Project Overview

TradeSmart is a full-stack application built with React + TypeScript frontend and Django + Python backend. It helps traders calculate transaction charges across different Indian stock brokers. The application features an intuitive UI that allows users to input transaction details (quantity, buy/sell prices) and instantly view a breakdown of all charges and fees that would be applied by the selected broker.

## Complete Project Structure

```
StockCalc-DjangoReact/           # Root directory
├── frontend/                     # Frontend React application
│   ├── src/                      # Source code directory
│   │   ├── components/           # Reusable UI components
│   │   │   ├── auth/             # Authentication-related components
│   │   │   ├── calculator/       # Calculator-specific components
│   │   │   ├── layout/           # Layout components
│   │   │   └── ui/               # General UI components (from shadcn/ui)
│   │   ├── context/              # React context providers
│   │   │   └── AuthContext.tsx   # Enhanced authentication context provider
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useCalculation.tsx # Handles calculation logic
│   │   │   ├── useTransactions.tsx # Manages transaction state
│   │   │   └── useUserTransactions.tsx # Fetches user transactions
│   │   ├── lib/                  # Utility functions
│   │   │   ├── api-helpers.ts    # API helper functions
│   │   │   ├── supabase.ts       # Supabase client configuration
│   │   │   └── utils.ts          # General utility functions
│   │   ├── pages/                # Page components
│   │   │   ├── Index.tsx         # Main calculator page
│   │   │   ├── Tools.tsx         # Additional calculation tools
│   │   │   └── Transactions.tsx  # User's saved transactions
│   │   ├── services/             # API and external service connections
│   │   │   └── api.ts            # API service functions
│   │   ├── types/                # TypeScript type definitions
│   │   │   ├── api.ts            # API response types
│   │   │   └── calculator.ts     # Calculator component types
│   │   └── config.ts             # Application configuration
│   ├── public/                   # Static files
│   ├── package.json              # Frontend dependencies
│   ├── vite.config.ts            # Vite configuration
│   ├── .env.development          # Development environment variables
│   ├── .env.production           # Production environment variables
│   └── tsconfig.json             # TypeScript configuration
│
├── backend/                      # Django backend application
│   ├── backend/                  # Main Django project settings and entrypoints
│   ├── calculator/               # Core calculator app
│   │   ├── models.py             # Database models (TransactionRecord, TransactionGroup)
│   │   ├── serializers.py        # DRF serializers
│   │   ├── urls.py               # URL routing for calculator endpoints
│   │   ├── authentication.py     # Custom Supabase JWT authentication
│   │   ├── views/                # Split views for clarity and maintainability
│   │   │   ├── __init__.py       # Exposes all views at package level
│   │   │   ├── calculation_views.py   # calculate_charges, save_calculation
│   │   │   ├── transaction_views.py   # test_api, TransactionRecordViewSet, TransactionGroupViewSet, SaveCalculationAPIView
│   │   │   └── health_views.py        # health_check and utility endpoints
│   │   ├── calculations/         # Modular trade-type calculation logic
│   │   │   ├── __init__.py           # Calculation package marker
│   │   │   ├── base_calculator.py    # Abstract base with shared logic and factory
│   │   │   ├── equity_delivery.py    # Delivery-specific calculation logic
│   │   │   ├── equity_intraday.py    # Intraday-specific calculation logic
│   │   │   └── utils.py              # Shared calculation utilities
│   │   ├── utils.py               # (Deprecated) Old TradeCalculator and helpers
│   │   ├── brokers/               # Broker-specific calculator implementations
│   │   │   ├── base.py            # Abstract base class for all broker calculators
│   │   │   ├── groww.py           # Groww-specific charge rules
│   │   │   ├── dhan.py            # Dhan-specific charge rules (delivery & intraday)
│   │   │   ├── rise.py            # Placeholder for Rise broker
│   │   │   └── others.py          # Placeholder for additional brokers
│   │   └── levies/                # Government levy calculations (trade-type specific)
│   │       ├── __init__.py            # Factory for government charges
│   │       ├── equity_delivery.py     # Delivery-specific government levies
│   │       └── equity_intraday.py     # Intraday-specific government levies
│   ├── requirements.txt           # Python dependencies
│   └── manage.py                  # Django CLI
├── .gitignore
```

## Core Configuration System

### config.ts

The `config.ts` file serves as the central configuration hub for the frontend application. It is responsible for:

1. **API URL Configuration**: Defines the base URL for all API calls using environment variables, with localhost as fallback.
   ```typescript
   export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
   ```

2. **Environment Detection**: Determines whether the app is running in production or development.
   ```typescript
   export const isProduction = 
     window.location.hostname.includes('onrender.com') || 
     window.location.hostname.includes('netlify.app') ||
     import.meta.env.PROD === true;
   ```

3. **API Endpoint Definitions**: Centralizes all API endpoint paths in a single object.
   ```typescript
   export const API_ENDPOINTS = {
     HEALTH_CHECK: `${API_PREFIX}/health-check/`,
     CALCULATE: `${API_PREFIX}/calculate/`,
     SAVE_CALCULATION: `${API_PREFIX}/save-calculation/`,
     TRANSACTION_GROUPS: `${API_PREFIX}/transaction-groups/`,
     TRANSACTIONS: `${API_PREFIX}/transactions/`,
   };
   ```

4. **URL Construction Utilities**: Provides helper functions for creating API URLs with proper path handling and query parameters.
   ```typescript
   export const getApiUrl = (endpoint: string): string => {
     const baseUrl = API_BASE_URL.endsWith('/') 
       ? API_BASE_URL.slice(0, -1) 
       : API_BASE_URL;
     return `${baseUrl}${endpoint}`;
   };
   ```

This centralized configuration approach allows for:
- Easy switching between development and production environments
- Simple updates to API endpoints without changing multiple files
- Consistent URL formatting across the application
- Environment-specific behavior with minimal code changes

## Frontend Components and Functionality

### Pages

- **Index.tsx**: The main page of the application that integrates all components and manages the main state. It handles the platform selection, dark mode toggle, and calculator component integration.

- **Transactions.tsx**: Page that displays saved transactions for authenticated users. Shows transaction history with filtering capabilities.

- **Tools.tsx**: Additional calculators like Profit Target Calculator and Net P&L Calculator.

### Calculator Components

- **CalculatorOptions.tsx**: Allows users to select trade type (equity delivery, equity intraday, F&O), exchange (NSE/BSE), and instrument type (future/option). 

- **TransactionForm.tsx**: Container for all transaction inputs, manages adding/removing transaction rows.

- **TransactionItem.tsx**: Individual transaction input form with fields for company name, quantity, buy price, and sell price. It displays validation errors and per-transaction charges.

- **CalculationResults.tsx**: Displays the calculation results with a breakdown of all charges (brokerage, STT, exchange charges, etc.) and shows the gross/net P&L.

- **SaveTransactionButton.tsx**: Button to save transactions with authentication protection.

### Authentication Components

- **AuthDialog.tsx**: Modal dialog for user authentication with login and registration tabs.

- **LoginForm.tsx**: Handles user login with error handling and validation.

- **SignupForm.tsx**: Manages user registration with form validation.

- **ProfileDropdown.tsx**: User profile menu with sign-out functionality.

### Custom Hooks

- **useTransactions.tsx**: Manages the transaction state and provides functions for:
  - Adding/removing transactions
  - Updating transaction details
  - Validating transaction inputs
  - Getting the company name
  - Checking for validation errors

- **useCalculation.tsx**: Handles the calculation logic and API communication:
  - Sends transaction data to the backend for charge calculations
  - Processes and formats the response data
  - Handles errors in the calculation process
  - Provides the saving functionality with backend integration
  
- **useUserTransactions.tsx**: Fetches and manages saved transactions from the backend:
  - Retrieves transaction history for authenticated users
  - Handles search and filtering
  - Manages loading states and errors

### API Services

- **api.ts**: Contains functions for API communication:
  - `calculateCharges`: Sends transaction data to the backend and retrieves charge calculations
  - `saveTransactions`: Saves transaction data to the user's account (requires authentication)
  - `getUserTransactions`: Fetches saved transactions for the authenticated user
  - `searchTransactions`: Searches saved transactions by title

## Backend Components and Functionality

### Django Project Structure

- **backend/**: Main Django project package with global settings, URL routing, and WSGI/ASGI configurations.
- **calculator/**: Django app responsible for all calculation logic, data models, serializers, and API views.

### Models & Serializers

- **TransactionRecord**: Stores individual trade details and computed values.
- **TransactionGroup**: Groups multiple transactions with summary statistics.
- **Serializers**: Convert model instances to/from JSON for REST API endpoints.

### Views & Endpoints

The calculator app's views are organized into three focused modules under `calculator/views`:

1. **calculation_views.py**
   - **`calculate_charges`** (`POST /api/calculate/`)
   - **`save_calculation`** (`POST /api/save-calculation/`)
2. **transaction_views.py**
   - **`test_api`** (`GET /api/test/`)
   - **`TransactionRecordViewSet`** (`/api/transactions/` CRUD)
   - **`TransactionGroupViewSet`** (`/api/transaction-groups/` CRUD + `search` + custom `update_summary` action)
   - **`SaveCalculationAPIView`** (alternate POST for saving groups)
3. **health_views.py**
   - **`health_check`** (`GET /api/health-check/`)

This modular approach improves readability and makes endpoints easier to maintain.

### Calculation Services

- **Modular Calculation System (`calculator/calculations/`)**: 
  - Uses a base calculator pattern (`base_calculator.py`) that initializes the correct broker and government levy calculators based on platform, exchange, and trade type.
  - Trade-type specific calculators (`equity_delivery.py`, `equity_intraday.py`) implement the main calculation logic for each trade type.
  - All calculation logic for delivery and intraday trades is now isolated in their respective files, making future updates and maintenance straightforward.
  - Shared calculation utilities are placed in `calculations/utils.py`.

- **Broker-specific calculators**: Implement brokerage logic for each broker. Only the brokerage component varies; government levies are computed by the trade-type-specific levy modules, ensuring consistency and reducing duplication.

### Government Levies

- **Trade-type specific government levies** are now implemented in `calculator/levies/`:
  - `equity_delivery.py`: Delivery-specific government charges (STT, exchange charges, stamp duty, SEBI fee, IPFT, GST)
  - `equity_intraday.py`: Intraday-specific government charges (different STT, no DP charges, different stamp duty, etc.)
  - `__init__.py`: Exposes a factory function `get_government_charges(trade_type, exchange)` to select the correct levy class for each calculation
- This separation of concerns ensures you can onboard new brokers or trade types quickly without touching unrelated levy calculations.

- **Adding a new broker or trade type** now only requires:
  1. Creating a new broker calculator in `calculator/brokers/`.
  2. Implementing or updating the trade-type calculator in `calculator/calculations/`.
  3. Registering the broker in the base calculator factory.

## Authentication Architecture

TradeSmart uses a dual authentication system:

### 1. Supabase Authentication (Frontend)

The frontend uses Supabase for user authentication with enhanced token management:

- **AuthContext.tsx**: Provides a React context for authentication state and functions.
  - Manages user session state
  - Provides signUp, signIn, and signOut functions
  - Implements proactive token refresh before expiration
  - Checks token expiration and refreshes when needed
  - Provides comprehensive error handling with toast notifications

- **supabase.ts**: Configures the Supabase client for authentication services.
  - Initialized with project URL and API key
  - Handles token storage and session management

### 2. Django JWT Authentication (Backend API)

The Django backend uses a custom JWT authentication implementation for API endpoints:

- **authentication.py**: Contains `SupabaseAuthentication` class that:
  - Extracts the JWT from the `Authorization` header.
  - Decodes and verifies the JWT using the Supabase project's JWT secret.
  - Disables audience (`aud`) validation to match Supabase's default tokens.
  - Creates Django users automatically based on Supabase authentication.
  - Handles token expiration and validation errors gracefully.

### 3. Authentication Flow

1. **User Registration/Login**: 
   - User registers or logs in via Supabase authentication
   - Supabase issues a JWT token

2. **Token Management**:
   - The token is stored in localStorage with the key 'auth_token'
   - The token is attached to all authenticated API requests
   - Token expiration is proactively checked, with automatic refresh when approaching expiry

3. **Token Validation**:
   - The Django backend validates the token for protected endpoints
   - If invalid, a 401/403 response is returned with detailed error messages

4. **Session Expiration**:
   - Token refresh is attempted before expiration
   - If refresh fails, user is notified and redirected to login

This architecture allows for secure authentication while maintaining separation between the frontend and backend systems.

## Environment Configuration

### Frontend (.env.development or .env.production)

The frontend requires environment variables to be set in a `.env.development` or `.env.production` file in the frontend directory:

```
VITE_API_URL=http://localhost:8000 or the backend hosted url
```

This variable is used by the frontend to determine where API requests should be sent. In development, it points to the local Django server. In production, it would point to the deployed backend API URL.

### Backend (Django settings)

For local development, the Django backend uses settings in `backend/backend/settings.py`. For production, environment variables should be used for sensitive information.

Key settings include:
- `DEBUG`: Should be set to False in production
- `ALLOWED_HOSTS`: Configured for the production domain
- `CORS_ALLOWED_ORIGINS`: Set to allow requests from the frontend origin
- `SECRET_KEY`: Should be kept secret and changed in production
- `SUPABASE_JWT_SECRET`: The JWT secret from Supabase project settings

## Calculation Trigger Flow

1. **User Input Triggers**:
   - When a user inputs valid transaction details (quantity, prices), the `useCalculation` hook detects the changes.
   - Through a `useEffect` dependency on transactions, exchange, and tradeType, the hook runs the calculation.
   - The hook checks if transactions are valid before triggering a calculation.

2. **API Request**:
   - The `handleCalculateCharges` function in `useCalculation` hook formats the transaction data.
   - It then calls the `calculateCharges` API function from services/api.ts.
   - This function makes a POST request to `/api/calculate/` with transaction data.

3. **Backend Processing**:
   - The Django view `calculate_charges` in views.py receives the request.
   - It extracts the platform, exchange, trade type, and transactions data.
   - It initializes a TradeCalculator with the appropriate broker-specific calculator.
   - The calculator processes each transaction and applies the appropriate charge formulas.

4. **Response Handling**:
   - The backend returns a structured JSON response with all charge details.
   - The `useCalculation` hook updates the calculationState with the results.
   - The UI components (particularly CalculationResults) automatically re-render with the new data.

## Transaction Saving Flow

1. **User Initiates Save**:
   - After performing a calculation, the user clicks the "Save" button.
   - If not logged in, the auth dialog appears.

2. **Data Preparation**:
   - The transaction data is formatted for saving.
   - Company name is used as the transaction title.

3. **API Request**:
   - The `handleSaveTransactions` function in `useCalculation` hook is called.
   - It first validates user authentication status and transaction data.
   - It uses the `saveTransactions` API function to send a POST request to `/api/save-calculation/`.
   - The authenticated user's token is included in the request.

4. **Backend Processing**:
   - The `save_calculation` view receives the request and validates the data.
   - It creates a TransactionGroup and associated TransactionRecord instances.
   - The summary calculations are updated for the group.

5. **Response Handling**:
   - On success, a toast notification confirms the save.
   - The user stays on the current page (no redirection).
   - On error, an appropriate error message is displayed.

## Data Flow and State Management

TradeSmart uses a combination of React hooks and context for state management:

1. **Local Component State**: For UI-specific state like modal visibility.

2. **Custom Hooks**: For domain-specific state with related functionality:
   - `useTransactions`: Manages transaction input state
   - `useCalculation`: Handles calculation state and API interactions
   - `useUserTransactions`: Manages saved transaction history

3. **Context API**: For application-wide state:
   - `AuthContext`: Manages authentication state across the application with enhanced token management

This approach provides a good balance between component isolation and shared state, while avoiding prop drilling and complex state management libraries.

## Deployment

### Frontend Deployment (Vercel)

1. **Build Process**:
   - The frontend is built using Vite's production build command `vite build`.
   - This generates optimized static files in the `dist/` directory.

2. **Environment Configuration**:
   - The `VITE_API_URL` environment variable must be set to the production backend URL.

3. **Deployment Steps**:
   - Connect GitHub repository to Vercel.
   - Vercel automatically deploys on push to the main branch.
   - Custom domains can be configured in the Vercel dashboard.

### Backend Deployment (Render)

1. **Hosting Configuration**:
   - Django application is deployed on Render.
   - PostgreSQL database is used for production data.

2. **Environment Setup**:
   - Environment variables are configured in the Render dashboard.
   - Production-specific settings are activated through environment variables.
   - CORS is configured to allow requests only from the frontend domain.

3. **API Security**:
   - HTTPS is enforced for all API requests.
   - JWT authentication protects user-specific endpoints.
   - Rate limiting is implemented to prevent abuse.

## Development Environment Setup

1. **Frontend Setup**:
   ```bash
   cd frontend
   # Create .env.development file with VITE_API_URL=http://localhost:8000
   npm install
   npm run dev
   ```

2. **Backend Setup**:
   ```bash
   # Create and activate virtual environment
   python -m venv venv
   # On Windows: venv\Scripts\activate
   # On Unix/Mac: source venv/bin/activate
   
   # Install dependencies
   cd backend
   pip install -r requirements.txt
   
   # Run migrations
   python manage.py migrate
   
   # Start development server
   python manage.py runserver
   ```

## Troubleshooting Common Issues

1. **API Connection Errors**:
   - Ensure the Django server is running on the port specified in the frontend .env file.
   - Check CORS settings in the Django backend to allow requests from the frontend origin.
   - Verify that the authentication token is being properly sent with requests.

2. **Authentication Issues**:
   - Clear localStorage and try logging in again.
   - Check console for token-related errors.
   - Verify token expiration handling is working correctly.
   - Ensure the backend has the correct SUPABASE_JWT_SECRET environment variable.

3. **Calculation Errors**:
   - Verify that transaction inputs are valid (positive numbers).
   - Check backend logs for any exceptions during calculation.
   - Ensure the appropriate broker calculator is being used based on the platform selection.

## Extending the Application

1. **Adding New Brokers**:
   - Subclass the base broker in `calculator/brokers/`.
   - Implement its brokerage fee structure (min/max rules, percentage fees).
   - Register it in `TradeCalculator`.

2. **Government Levies**:
   - Already centralized in `calculator/levies/`; no updates needed when adding brokers.

With this architecture, extending to additional brokers is straightforward and minimizes repetitive code.
