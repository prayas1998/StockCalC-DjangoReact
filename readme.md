# StockCalc - Stock Brokerage Calculator

A comprehensive tool for calculating brokerage charges, taxes, and fees for stock market transactions across different platforms in India.

## Features

- **Multiple Transaction Support**: Add and calculate charges for multiple transactions of the same stock to get average buy price
- **Accurate Fee Calculation**: Precise computation of brokerage charges and all statutory levies (STT, Exchange fees, SEBI charges, etc.)
- **Real-time Updates**: Instant recalculation as you update transaction details
- **Profit/Loss Analysis**: Clear display of gross and net P&L after accounting for all charges
- **Platform Support**: Currently optimized for GROWW with plans to add support for RIISE and others
- **Exchange Support**: Calculations for NSE (with BSE support in the works)
- **Dark/Light Mode**: Toggle between dark and light themes
- **User Authentication**: Sign up and login with Supabase authentication
- **Save Transactions**: Save your transactions to your account
- **Transaction History**: View your saved transactions

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Django REST Framework
- **Database**: SQLite (development), Supabase PostgreSQL (user data)
- **Authentication**: Supabase Auth

## Project Structure

The project follows a standard Django-React structure:

```
StockCalc/
├── backend/           # Django backend
│   ├── calculator/    # Main app for brokerage calculations
│   │   ├── brokers/   # Broker-specific calculation logic
│   │   └── levies/    # Government charges calculation
│   └── backend/       # Django project settings
└── frontend/          # React frontend
    └── src/
        ├── components/  # Reusable UI components
        │   └── auth/    # Authentication components
        ├── context/     # React contexts including AuthContext
        ├── lib/         # Utility functions and Supabase client
        ├── pages/       # Page components including the main calculator
        └── services/    # API services for backend communication
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/stockcalc-djangoreact.git
   cd stockcalc-djangoreact
   ```

2. Set up the backend:
   ```
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

3. Set up the frontend:
   ```
   cd frontend
   npm install
   cp .env.example .env.local  # Copy and update with your Supabase credentials
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or whatever port Vite assigns)

## Setting Up Supabase

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project and note down the URL and anon/public key
3. Set up authentication in the Supabase dashboard:
   - Enable Email auth provider
   - For development, you can disable email confirmation

4. Set up the required tables in Supabase:
   ```sql
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users ON DELETE CASCADE,
     first_name TEXT NOT NULL,
     last_name TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     PRIMARY KEY (id)
   );

   CREATE TABLE transactions (
     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
     user_id UUID REFERENCES auth.users ON DELETE CASCADE,
     platform TEXT NOT NULL,
     exchange TEXT NOT NULL,
     trade_type TEXT NOT NULL,
     company_name TEXT,
     quantity INTEGER NOT NULL,
     buy_price DECIMAL NOT NULL,
     sell_price DECIMAL NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

5. Set up Row Level Security (RLS) policies:
   ```sql
   -- Profiles table policies
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can view their own profile" 
     ON profiles FOR SELECT 
     USING (auth.uid() = id);

   CREATE POLICY "Users can update their own profile" 
     ON profiles FOR UPDATE 
     USING (auth.uid() = id);

   -- Transactions table policies
   ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can view their own transactions" 
     ON transactions FOR SELECT 
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert their own transactions" 
     ON transactions FOR INSERT 
     WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update their own transactions" 
     ON transactions FOR UPDATE 
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can delete their own transactions" 
     ON transactions FOR DELETE 
     USING (auth.uid() = user_id);
   ```

## Environment Variables

Create a `.env.local` file in the frontend directory with the following variables:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Usage

1. Input your stock transactions with quantity, buy price, and sell price
2. Select the exchange (NSE) and trade type
3. Add multiple transactions if needed using the "+" button
4. View real-time calculation of:
   - Average buy price across all transactions
   - Detailed breakdown of all charges (brokerage, STT, etc.)
   - Gross and net profit/loss
5. Sign up or login to save your transactions
6. View your saved transactions in the Transactions page

## Key Calculation Details

### GROWW Brokerage

- Equity Delivery: 0.1% or ₹2 (whichever is higher) per transaction side, capped at ₹20
- The calculator accurately implements the specific fee structure used by GROWW

### Government Charges

- Securities Transaction Tax (STT): 0.1% on the total turnover
- Exchange Transaction Charges: 0.00000375 of turnover (BSE) or 0.0000297 of turnover (NSE)
- SEBI Turnover Fees: 0.0001% of turnover
- Investor Protection Fund: 0.0001% of turnover (NSE)
- Stamp Duty: 0.015% on buy value
- GST: 18% on (brokerage + exchange fees + SEBI fees)

## Future Plans

- Add support for more brokers
- Email verification for authentication
- User profile management
- Enhanced transaction history with filtering and sorting
- Export transactions to CSV/PDF
