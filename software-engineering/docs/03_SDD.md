# Software Design Document

## Design goals
1. Keep the system simple and explainable.
2. Keep the prediction model replaceable.
3. Centralize input validation.
4. Keep business logic independent from the UI.

## Layers

Presentation/UI
-> Service/Application Logic
-> Validation + Failure Predictor
-> Prediction Repository
-> Data Models

The Java prototype described in the report contains CncPredictorApp, PredictionService, InputValidator, FailurePredictor, RuleBasedPredictor, PredictionRepository and the model/value classes.

## Current dashboard integration

The current dashboard shows a trained RandomForestClassifier with 150 trees and a tuned threshold of 0.26. The browser UI calls the ML prediction API through /api/ml/predict.

## Data flow

User input -> validation -> prediction engine -> probability/class -> risk level -> history -> dashboard analytics/export.