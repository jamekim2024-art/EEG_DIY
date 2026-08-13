# Future EEGNet integration

Do not implement EEGNet in Version 1.

Introduce `backend/app/ml/eegnet.py` only when:

- Enough labeled recordings exist
- Classical models (Logistic Regression, Random Forest, SVM) are benchmarked
- GroupKFold / trial-level splitting prevents leakage
- Signal acquisition is stable

The `BaseSignalSource` abstraction allows hardware upgrades without rewriting the dashboard.
