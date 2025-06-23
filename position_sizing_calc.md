# Position Sizing Calculator

## Overview

The Position Sizing Calculator is a sophisticated tool designed to help traders determine the optimal number of shares or contracts to purchase based on their risk tolerance. Unlike other calculators that simply perform basic calculations, this calculator incorporates broker-specific charges and leverages to provide accurate position sizing that ensures the trader's actual risk never exceeds their risk budget.

## Key Features

- **Risk-Based Position Sizing**: Calculate position size based on either a fixed risk amount or a percentage of capital
- **Broker-Specific Calculations**: Accounts for different fee structures across supported brokers (Dhan, Groww)
- **Trade Type Support**: Handles both equity delivery and intraday trading with appropriate leverage
- **Position Type Support**: Supports both long and short positions with appropriate breakeven calculations
- **Breakeven Price Calculation**: Shows the price at which the trade breaks even, accounting for all charges
- **Charge-Adjusted Risk**: Ensures that brokerage fees and other charges are factored into the risk calculation

## Implementation Architecture

The Position Sizing Calculator follows a clean architecture pattern with separation of concerns:

1. **Container Component**: Manages state and broker/trade type/position type selection
2. **Presenter Component**: Handles the UI rendering and user interactions
3. **Hook**: Provides the calculation logic and state management
4. **Service**: Contains the core calculation algorithms
5. **Validation**: Ensures inputs meet the required criteria

## Component Structure

### BrokerTradeTypeSelector Component

The `BrokerTradeTypeSelector` component is a versatile UI element used consistently across all calculators in the application.

```tsx
interface BrokerTradeTypeSelectorProps {
  selectedBroker: BrokerType;
  selectedTradeType: TradeType;
  onBrokerChange: (broker: BrokerType) => void;
  onTradeTypeChange: (tradeType: TradeType) => void;
  positionType?: PositionType;
  onPositionTypeChange?: (positionType: PositionType) => void;
  compact?: boolean;
}
```

The component has two rendering modes:

1. **Compact Mode** (`compact={true}`):
   - Used in individual calculators like the Position Sizing Calculator
   - More condensed UI with smaller controls and reduced spacing
   - Displays all selectors in a single row with smaller gaps
   - Uses a background with a left border accent

2. **Standard Mode** (`compact={false}`):
   - Used in shared settings areas like the P&L calculators section
   - More spacious layout with standard-sized controls
   - More detailed UI with larger icons and preview of selected values

For intraday trading, the component displays a position type selector (long/short) that affects calculation results.

### RiskModeSelector Component

The `RiskModeSelector` is a dedicated component for the Position Sizing Calculator that handles the risk mode selection.

```tsx
interface RiskModeSelectorProps {
  riskMode: 'amount' | 'percent';
  onRiskModeChange: (riskMode: 'amount' | 'percent') => void;
  compact?: boolean;
}
```

This component:
- Allows switching between fixed amount and percentage-based risk calculation
- Has both compact and standard rendering modes to match the BrokerTradeTypeSelector
- Is used exclusively in the Position Sizing Calculator

## Calculation Logic

The Position Sizing Calculator uses a sophisticated algorithm to determine the optimal position size:

1. **Risk Budget Calculation**:
   - For fixed amount mode: Uses the direct risk amount input
   - For percentage mode: Calculates risk as a percentage of total capital

2. **Position Size Determination**:
   - Uses a binary search algorithm to find the maximum quantity that keeps total risk (including charges) under the risk budget
   - Accounts for the price difference between entry and stop loss based on position type:
     - For long positions: Risk is entry price minus stop loss
     - For short positions: Risk is stop loss minus entry price
   - Factors in all applicable charges for both entry and exit transactions

3. **Leverage Application**:
   - For intraday trades, applies the broker's leverage (typically 5x)
   - Adjusts capital requirements accordingly

4. **Breakeven Calculation**:
   - Calculates breakeven price based on selected position type (long or short)
   - Accounts for all charges in the breakeven determination

## Example Workflow

1. User selects broker (Dhan/Groww), trade type (delivery/intraday), and position type (long/short for intraday)
2. User chooses risk mode (amount/percent) using the separate RiskModeSelector
3. User enters required inputs:
   - For amount mode: risk amount, entry price, stop loss
   - For percent mode: capital, risk percentage, entry price, stop loss
4. The calculator determines the optimal quantity that keeps actual risk under the risk budget
5. Results display quantity, position value, capital used, and the appropriate breakeven price based on position type

## Technical Implementation

The calculator uses several advanced techniques:

1. **Memoization**: Uses React's `useMemo` to prevent unnecessary recalculations
2. **Real-time Calculation**: Updates results as inputs change
3. **Binary Search Algorithm**: Efficiently finds the optimal position size
4. **Charge Integration**: Incorporates broker-specific fee structures
5. **Component Separation**: Separates concerns between different UI components for better maintainability

## Conclusion

The Position Sizing Calculator is a powerful tool that helps traders make informed decisions about position sizing while ensuring their risk remains within predefined limits. Its integration with broker-specific charges and leverage settings, along with support for both long and short positions, makes it particularly valuable for real-world trading scenarios.