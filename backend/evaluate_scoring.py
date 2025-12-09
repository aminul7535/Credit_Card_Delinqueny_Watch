# evaluate_scoring.py
import sys
import os
import pandas as pd
import numpy as np

# adapt path so we can import scoring.score_row
# assume backend/scoring.py exports score_row
sys.path.insert(0, os.path.abspath("backend"))
from scoring import score_row   # must match your file

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
import matplotlib.pyplot as plt

# ----- CONFIG -----
CSV_PATH = "data/test_accounts.csv"   # change to your test CSV
USE_BINARY = True   # True -> delinquent (DPD>=1) vs not; False -> multiclass
# If using binary, choose probability threshold for prediction (0..1)
PROB_THRESHOLD = 0.5   # you can tune this (0.4, 0.45...) to balance recall/precision

# ----- LOAD CSV -----
df = pd.read_csv(CSV_PATH)
print(f"Loaded {len(df)} rows from {CSV_PATH}")

# Ensure label column exists
label_col_candidates = ["DPD Bucket Next Month", "DPD_Bucket_Next_Month", "DPD", "dpd"]
label_col = None
for c in label_col_candidates:
    if c in df.columns:
        label_col = c
        break
if label_col is None:
    raise RuntimeError("No DPD label column found. Add 'DPD Bucket Next Month' to CSV.")

y_true_raw = df[label_col].fillna(0).astype(int).values

# ----- Score rows using your scoring engine -----
pred_probs = []
pred_scores = []
rows_out = []
for _, row in df.iterrows():
    row_dict = row.to_dict()
    out = score_row(row_dict)   # uses your scoring.py function
    rows_out.append(out)
    # canonical probability = score_norm (we set risk_score == score_norm)
    prob = float(out.get("score_norm", out.get("risk_score", 0.0)))
    pred_probs.append(prob)
    pred_scores.append(prob)  # same here (kept for clarity)

pred_probs = np.array(pred_probs)

# ----- Build binary/multiclass predictions -----
if USE_BINARY:
    # define true binary labels: delinquent if dpd >= 1
    y_true = (y_true_raw >= 1).astype(int)
    y_pred = (pred_probs >= PROB_THRESHOLD).astype(int)
else:
    # multiclass: use thresholds to bucket score_norm into Low/Medium/High mapping
    # adapt threshold cutoffs to match your scoring.RISK_THRESHOLDS
    def score_to_class(p):
        if p >= 0.50:
            return 3  # High -> map to DPD 3 (approx)
        elif p >= 0.40:
            return 2  # Medium -> DPD 2
        else:
            return 0  # Low -> DPD 0
    y_true = y_true_raw
    y_pred = np.array([score_to_class(p) for p in pred_probs])

# ----- Metrics (binary) -----
if USE_BINARY:
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    try:
        auc = roc_auc_score(y_true, pred_probs)
    except Exception:
        auc = float("nan")
    print("Binary evaluation (delinquent >=1 vs 0):")
    print(f"Rows: {len(df)}  Positive cases: {y_true.sum()}  Negative: {len(df)-y_true.sum()}")
    print(f"Accuracy: {acc:.4f}  Precision: {prec:.4f}  Recall: {rec:.4f}  F1: {f1:.4f}  AUC: {auc:.4f}")
    print("\nConfusion matrix (rows: true, cols: pred):")
    print(confusion_matrix(y_true, y_pred))
    print("\nClassification report:")
    print(classification_report(y_true, y_pred, digits=4))
else:
    # multiclass report
    print("Multiclass classification report (raw DPD buckets vs predicted classes):")
    print(classification_report(y_true, y_pred, digits=4))
    print("Confusion matrix:")
    print(confusion_matrix(y_true, y_pred))

# ----- ROC curve plot (binary) -----
if USE_BINARY:
    from sklearn.metrics import roc_curve
    fpr, tpr, thr = roc_curve(y_true, pred_probs)
    plt.figure(figsize=(6,5))
    plt.plot(fpr, tpr, label=f"AUC={auc:.3f}")
    plt.plot([0,1],[0,1],"--",color="gray")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve")
    plt.legend()
    plt.tight_layout()
    plt.savefig("roc_curve.png")
    print("Saved ROC curve to roc_curve.png")

# ----- Save scored rows (optional) -----
out_df = df.copy()
# attach predictions
out_df["pred_prob"] = pred_probs
out_df["pred_label_binary"] = y_pred if USE_BINARY else (y_pred)
out_df["true_label_raw"] = y_true_raw
out_df.to_csv("scored_test_output.csv", index=False)
print("Saved scored rows to scored_test_output.csv")
