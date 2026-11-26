# Testing and Traceability

The supplied SE report records 38 test cases:
- Logic/service: 32/32 passed
- GUI: 6/6 passed after correcting one incorrect expected value
- Total: 38/38 passed
- Reported first-prediction timing: about 30 ms, against a 1,000 ms requirement

The tests cover validation, boundaries, prediction behavior, history, predictor replacement and GUI behavior.

Important: SE functional tests are not the same as ML quality evaluation. Recall, precision, F1, PR-AUC and ROC-AUC belong to the ML evaluation stage.

Traceability chain:
Requirement -> Design -> Implementation -> Test -> Evidence

NFR-07 is linked to ML evaluation, not to the old rule-based prototype.