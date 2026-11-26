# System Architecture

Web Dashboard
  |
  v
Application/API
  |
  v
Random Forest ML Engine (150 trees, tau=0.26)
  |
  v
Prediction History / Local Storage

Risk bands:
- LOW < 30%
- MEDIUM 30% to < 50%
- HIGH >= 50%

The ML decision threshold (26%) is separate from the UI risk-band thresholds.