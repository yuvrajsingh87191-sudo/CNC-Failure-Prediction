# Project Proposal

## Title
CNC Machine Failure Prediction Using AI and ML

## Problem
Unexpected CNC machine failures can cause unplanned downtime, maintenance cost and production disruption. The project provides an early warning from a machine operating snapshot.

## Objective
Build a software system that accepts machine readings and produces a failure/no-failure decision with a risk percentage and maintenance guidance.

## Users
- Maintenance Engineer — primary user.
- Production Supervisor — secondary user.

## In scope
- Six machine/product inputs.
- Input validation.
- Failure/no-failure prediction.
- Risk percentage and LOW/MEDIUM/HIGH classification.
- Prediction history.
- Analytics and model-performance evidence.

## Out of scope
- Direct CNC/PLC connection.
- Time-to-failure / remaining useful life.
- Exact failure-mode identification.
- Combining unrelated datasets into one training set.

## ML connection
The AI/ML component uses the AI4I 2020 dataset. The current dashboard reports a 150-tree Random Forest and exposes probability, tree votes, threshold and latency.

## Success criteria
The SE report defines an ML quality target of Recall >= 0.80 and Precision >= 0.50 on the held-out test set.