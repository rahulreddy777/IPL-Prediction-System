"""
train_model.py  –  wrapper that invokes the backend ML training pipeline.

Usage (from repo root):
  python IPL-Prediction-System/ml-model/train_model.py
"""

import os
import sys


def _add_backend_ml_to_path() -> None:
    here       = os.path.dirname(os.path.abspath(__file__))
    backend_ml = os.path.abspath(os.path.join(here, "..", "backend", "ml"))
    if backend_ml not in sys.path:
        sys.path.insert(0, backend_ml)


def main() -> None:
    _add_backend_ml_to_path()
    from train_ml_model import main as train_main  # type: ignore
    train_main()


if __name__ == "__main__":
    main()
