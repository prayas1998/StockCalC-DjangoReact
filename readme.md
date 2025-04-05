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

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Django REST Framework
- **Database**: SQLite (development)

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
        ├── pages/       # Page components including the main calculator
        └── services/    # API services for backend communication
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn

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
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or whatever port Vite assigns)

## Usage

1. Input your stock transactions with quantity, buy price, and sell price
2. Select the exchange (NSE) and trade type
3. Add multiple transactions if needed using the "+" button
4. View real-time calculation of:
   - Average buy price across all transactions
   - Detailed breakdown of all charges (brokerage, STT, etc.)
   - Gross and net profit/loss

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

## Unique Advantages

- **Multiple Transaction Support**: Unlike most calculators that only handle single transactions, this calculator supports multiple transactions of the same stock, providing an accurate average buy price.
- **Comprehensive Fee Calculation**: Includes all applicable fees and taxes with precise formulas matching the actual amounts charged by brokers.
- **Profit/Loss Analysis**: Clear visualization of both gross P&L (before charges) and net P&L (after all charges).

## Future Plans

- Add support for RIISE and other brokerage platforms
- Implement BSE exchange calculations
- Add support for intraday equity, futures, and options trading
- Historical transaction saving and comparison
- Mobile app version
