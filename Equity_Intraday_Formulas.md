# Dhan Equity Intraday Charges – Detailed Calculation

---

## 1. Brokerage

**Formula:**
```
Brokerage = min(₹20, 0.03% of turnover per leg)
```
- Applied separately to **buy** and **sell**
- Rounding: 2 decimal places

---

## 2. Transaction Charges (NSE)

**Formula:**
```
Transaction Charge = 0.00297% of total turnover
```
- Rounding: 2 decimal places

---

## 3. GST (Goods & Services Tax)

**Formula:**
```
GST = 18% of (Brokerage + Transaction Charges + SEBI Fee + IPFT)
```
- Rounding: 2 decimal places

---

## 4. Securities Transaction Tax (STT)

**Formula:**
```
STT = 0.025% of sell value
```
- Rounding: Nearest rupee

---

## 5. SEBI Turnover Fees

**Formula:**
```
SEBI Fee = 0.0001% of total turnover
```
- Rounding: 2 decimal places

---

## 6. Stamp Duty

**Formula:**
```
Stamp Duty = 0.003% of buy value
```
- Applied **only on buy**
- Rounding: Nearest rupee  
- **Can be ₹0 if < ₹0.50**

---

## 7. IPFT Contribution

**Formula:**
```
IPFT = 0.0001% of total turnover
```
- Rounding: 2 decimal places

---

## Real-World Example

**Trade Details:**
- Quantity = 20  
- Buy Price = ₹724.30  
- Sell Price = ₹725.00

### Step-by-step Calculation

```
Buy Turnover  = 20 × 724.30 = ₹14,486.00  
Sell Turnover = 20 × 725.00 = ₹14,500.00  
Total Turnover = ₹28,986.00
```

#### Brokerage
```
Buy: min(20, 0.03% of 14,486) = ₹4.35  
Sell: min(20, 0.03% of 14,500) = ₹4.35  
Total = ₹8.70
```

#### Transaction Charges
```
0.00297% of 28,986 = ₹0.86
```

#### SEBI Fee
```
0.0001% of 28,986 = ₹0.03
```

#### IPFT
```
0.0001% of 28,986 = ₹0.03
```

#### GST
```
18% of (8.70 + 0.86 + 0.03 + 0.03) = ₹1.73
```

#### STT
```
0.025% of 14,500 = ₹3.625 → ₹4 (rounded)
```

#### Stamp Duty
```
0.003% of 14,486 = ₹0.434 → ₹0 (rounded)
```

---

## Final Breakdown

| Charge Type        | Amount (₹) |
|--------------------|------------|
| Brokerage          | 8.70       |
| Transaction Charge | 0.86       |
| SEBI Fee           | 0.03       |
| IPFT               | 0.03       |
| GST                | 1.73       |
| STT                | 4.00       |
| Stamp Duty         | 0.00       |
| **Total**          | **15.35**  |

---
