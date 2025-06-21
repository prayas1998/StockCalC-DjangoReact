# Tools Page Documentation

## Overview

The Tools page serves as a central hub for various financial calculators designed to assist traders in making informed decisions. The page provides specialized calculators for position sizing, profit targeting, and net profit/loss calculations with support for different brokers and trade types.

## Features

### 1. Position Sizing Calculator
- Calculates optimal position size based on risk parameters
- Supports risk calculation by amount or percentage
- Displays position value, capital usage, and buying power
- Includes estimated charges in calculations
- Independent broker and trade type selection

### 2. Profit Target Calculator
- Calculates required exit price to achieve target profit percentage
- Accounts for all trading charges in calculations
- Displays gross profit, net profit, and breakeven price
- Shares broker and trade type settings with Net P&L Calculator

### 3. Net P&L Calculator
- Calculates actual profit/loss based on entry and exit prices
- Shows gross profit/loss, total charges, and net profit/loss
- Displays profit/loss as both amount and percentage
- Provides detailed charges breakdown
- Shares broker and trade type settings with Profit Target Calculator

### 4. Shared Settings Panel
- Unified broker selection (Dhan, Groww)
- Trade type selection (equity delivery, equity intraday)
- Position type selection (long, short)
- Exchange information display (fixed to NSE)

## Architecture

### Component Structure

frontend/
│   ├── src/                                                                                     
│   │   ├── pages/
│   │   │   ├── Tools.tsx                           # Main Tools page component
│   │   │   └── Tools/                              # Utility files for Tools page 
│   │   │       ├── BreakEven.ts                    # Breakeven price calculation logic
│   │   │       └── ChargesUtils.ts                 # Trading charges calculation utilities
│   │   │                                                                                        
│   │   ├── components/                                                                          
│   │   ├── calculators/                        # Calculator components
│   │   │   ├── NetPLCalculatorContainer.tsx    # Container for Net P&L Calculator
│   │   │   ├── NetPLCalculatorPresenter.tsx    # Presenter for Net P&L Calculator
│   │   │   ├── ProfitTargetCalculatorContainer.tsx  # Container for Profit Target Calculator
│   │   │   ├── ProfitTargetCalculatorPresenter.tsx  # Presenter for Profit Target Calculator
│   │   │   ├── PositionSizingCalculatorContainer.tsx  # Container for Position Sizing Calculator
│   │   │   └── PositionSizingCalculatorPresenter.tsx  # Presenter for Position Sizing Calculator
│   │   │                                                                                        
│   │   └── shared/                             # Shared components
│   │       ├── BrokerTradeTypeSelector.tsx     # Broker and trade type selection component
│   │       ├── CalculatorCard.tsx              # Wrapper for calculator UI
│   │       └── ResultsPanel.tsx                # Component to display calculation results
│   │                                                                                            
│   ├── hooks/                                  # Custom hooks
│   │   ├── useSharedCalculatorState.ts         # Hook for shared calculator state
│   │   ├── useNetPLCalculator.ts               # Hook for Net P&L Calculator logic
│   │   ├── useProfitTargetCalculator.ts        # Hook for Profit Target Calculator logic
│   │   └── usePositionSizingCalculator.ts      # Hook for Position Sizing Calculator logic
│   │                                                                                            
│   ├── services/                               # Business logic services
│   │   └── calculators/                        # Calculator-specific services
│   │       ├── NetPLCalculatorService.ts       # Service for Net P&L calculations
│   │       ├── ProfitTargetCalculatorService.ts  # Service for Profit Target calculations
│   │       └── PositionSizingCalculatorService.ts  # Service for Position Sizing calculations
│   │                                                                                            
│   └── types/                                  # TypeScript type definitions
│       └── calculator.ts                       # Types for calculator components and data
│                                                                                                
└── public/                                     # Public assets

### Design Pattern

The Tools page implements a Container-Presenter pattern:
- **Container Components**: Handle state management and business logic
- **Presenter Components**: Handle UI rendering and user interactions
- **Shared State**: Managed through custom hooks for coordinated updates

## Key Files and Functions

### Page Components

#### `frontend/src/pages/Tools.tsx`
- Main page component that integrates all calculator components
- Manages shared state for P&L calculators
- Maintains independent state for Position Sizing Calculator

### Calculator Containers

#### `frontend/src/components/calculators/PositionSizingCalculatorContainer.tsx`
- Container component for Position Sizing Calculator
- Connects the presenter with the position sizing hook
- Passes broker and trade type settings to the presenter

#### `frontend/src/components/calculators/NetPLCalculatorContainer.tsx`
- Container component for Net P&L Calculator
- Connects the presenter with the net P&L hook
- Uses shared calculator state for broker and trade type settings

#### `frontend/src/components/calculators/ProfitTargetCalculatorContainer.tsx`
- Container component for Profit Target Calculator
- Connects the presenter with the profit target hook
- Uses shared calculator state for broker and trade type settings

### Calculator Presenters

#### `frontend/src/components/calculators/PositionSizingCalculatorPresenter.tsx`
- UI component for Position Sizing Calculator
- Renders input fields, broker selector, and results
- Handles user interactions and input validation

#### `frontend/src/components/calculators/NetPLCalculatorPresenter.tsx`
- UI component for Net P&L Calculator
- Renders input fields and results panel
- Displays profit/loss information and charges breakdown

#### `frontend/src/components/calculators/ProfitTargetCalculatorPresenter.tsx`
- UI component for Profit Target Calculator
- Renders input fields and results panel
- Shows required exit price and expected profit

### Hooks

#### `frontend/src/hooks/useSharedCalculatorState.ts`
- Manages shared state for broker and trade type selection
- Provides state and setter functions for P&L calculators
- Maintains position type (long/short) selection

#### `frontend/src/hooks/usePositionSizingCalculator.ts`
- Manages state for Position Sizing Calculator
- Handles real-time calculation based on input changes
- Validates inputs and formats results

#### `frontend/src/hooks/useNetPLCalculator.ts`
- Manages state for Net P&L Calculator
- Calculates profit/loss based on entry/exit prices
- Integrates with shared calculator state

#### `frontend/src/hooks/useProfitTargetCalculator.ts`
- Manages state for Profit Target Calculator
- Calculates target exit price based on desired profit percentage
- Integrates with shared calculator state

### Services

#### `frontend/src/services/calculators/PositionSizingCalculatorService.ts`
- Contains business logic for position sizing calculations
- Handles different risk modes (amount vs percentage)
- Calculates maximum position size based on risk parameters

#### `frontend/src/services/calculators/NetPLCalculatorService.ts`
- Implements profit/loss calculation logic
- Handles both long and short positions
- Calculates breakeven price and charges

#### `frontend/src/services/calculators/ProfitTargetCalculatorService.ts`
- Implements target price calculation logic
- Accounts for all charges in profit target calculation
- Handles different position types and trade types

### Shared Components

#### `frontend/src/components/shared/BrokerTradeTypeSelector.tsx`
- Reusable component for broker and trade type selection
- Supports position type selection (long/short)
- Can be configured for compact or expanded display

#### `frontend/src/components/shared/CalculatorCard.tsx`
- Wrapper component for calculator UI
- Provides consistent styling and layout
- Supports disabled state for unsupported combinations

#### `frontend/src/components/shared/ResultsPanel.tsx`
- Displays calculation results in a structured format
- Shows charges breakdown
- Formats currency values consistently

### Utility Files

#### `frontend/src/pages/Tools/ChargesUtils.ts`
- Contains functions for calculating various trading charges
- Implements broker-specific charge calculations
- Provides currency formatting utilities

#### `frontend/src/pages/Tools/BreakEven.ts`
- Implements breakeven price calculation logic
- Handles different position types and trade types
- Accounts for all charges in breakeven calculation

## State Management

### Independent State (Position Sizing)
- Managed locally within the Tools component
- Includes broker and trade type selection
- Not affected by changes to shared state

### Shared State (P&L Calculators)
- Managed through useSharedCalculatorState hook
- Synchronized between Profit Target and Net P&L calculators
- Includes broker, trade type, and position type

## Calculation Flow

1. User inputs parameters in calculator forms
2. Real-time validation occurs on input change
3. Calculator hooks trigger recalculation on valid input
4. Calculator services perform business logic calculations
5. Results are formatted and displayed in the UI
6. Charges breakdown is shown for transparency

## Future Enhancements

- Support for additional brokers
- Currency selection options
- Saving calculator presets
- Integration with journal entries
- Mobile-optimized layout
- Dark mode support

## Developer Notes

- All calculators use real-time calculation for immediate feedback
- The shared state pattern reduces duplication and ensures consistency
- The Container-Presenter pattern separates concerns for better maintainability
- Utility functions are centralized for consistent calculation across components