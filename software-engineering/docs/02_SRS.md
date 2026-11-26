# Software Requirements Specification

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Enter product type and five readings | High |
| FR-02 | Validate every input before prediction | High |
| FR-03 | Predict failure or no failure | High |
| FR-04 | Show risk %, risk level and advice | High |
| FR-05 | Save successful predictions | Medium |
| FR-06 | View prediction history newest first | Medium |
| FR-07 | Reset the prediction form | Medium |
| FR-08 | Clear prediction history after confirmation | Low |

## Non-Functional Requirements

| ID | Quality | Requirement |
|---|---|---|
| NFR-01 | Performance | Validation + prediction within 1 second on a standard laptop |
| NFR-02 | Usability | Fill -> Predict -> Read result |
| NFR-03 | Reliability | Invalid input must not crash the application |
| NFR-04 | Maintainability | Layered design and replaceable prediction component |
| NFR-05 | Portability | Prototype runs on JDK 17+ without external libraries |
| NFR-06 | Security/privacy | No personal data in prototype; authentication is future production work |
| NFR-07 | ML quality | Recall >= 0.80 and Precision >= 0.50 on held-out data |

## Input constraints

- Type: L / M / H
- Air temperature: 290–310 K
- Process temperature: 300–320 K and greater than air temperature
- Rotational speed: 500–4000 rpm, whole number
- Torque: 1–100 Nm
- Tool wear: 0–300 min, whole number

## Use cases
UC-01 Predict machine failure; UC-02 Validate readings; UC-03 View history; UC-04 Reset form; UC-05 Clear history.