"""Rebuild the merged notebook's reference results and export the website data to src/data/fd001.json.

The code repeats nasa_fd001_predictive_maintenance.ipynb (same data, label, features, folds, models, grids,
threshold and seeds), so every number on the site comes from the same pipeline. The asserts check its reference results.

Run from the repository root:  python3 website/scripts/export_data.py
"""
import json
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.inspection import permutation_importance
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score, f1_score, precision_recall_curve,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import GridSearchCV, GroupKFold
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "cmapss_nasa_turbo_engine_6_data" / "CMAPSSData"
OUT = ROOT / "website" / "src" / "data" / "fd001.json"
MODEL_FILE = ROOT / "models" / "fd001_logistic_regression.joblib"
MODEL_CARD = ROOT / "models" / "fd001_logistic_regression.json"
W, N_FOLDS, SEED = 30, 5, 0

# ---------------------------------------------------------------- data, label, features (notebook sections 1, 5, 13)
SETTINGS = ["setting_1", "setting_2", "setting_3"]
SENSORS = [f"s{i}" for i in range(1, 22)]
COLUMNS = ["unit", "cycle"] + SETTINGS + SENSORS

SENSOR_INFO = {
    "s1": ("T2", "Fan inlet temperature"), "s2": ("T24", "LPC outlet temperature"),
    "s3": ("T30", "HPC outlet temperature"), "s4": ("T50", "LPT outlet temperature"),
    "s5": ("P2", "Fan inlet pressure"), "s6": ("P15", "Bypass duct pressure"),
    "s7": ("P30", "HPC outlet pressure"), "s8": ("Nf", "Physical fan speed"),
    "s9": ("Nc", "Physical core speed"), "s10": ("epr", "Engine pressure ratio"),
    "s11": ("Ps30", "HPC outlet static pressure"), "s12": ("phi", "Fuel flow / Ps30"),
    "s13": ("NRf", "Corrected fan speed"), "s14": ("NRc", "Corrected core speed"),
    "s15": ("BPR", "Bypass ratio"), "s16": ("farB", "Burner fuel-air ratio"),
    "s17": ("htBleed", "Bleed enthalpy"), "s18": ("Nf_dmd", "Demanded fan speed"),
    "s19": ("PCNfR_dmd", "Demanded corrected fan speed"), "s20": ("W31", "HPT coolant bleed"),
    "s21": ("W32", "LPT coolant bleed"),
}


def load_cmapss(filename):
    return pd.read_csv(DATA_DIR / filename, sep=r"\s+", header=None, names=COLUMNS)


train = load_cmapss("train_FD001.txt")
test = load_cmapss("test_FD001.txt")
rul_test = pd.read_csv(DATA_DIR / "RUL_FD001.txt", header=None, names=["RUL"])
rul_test["unit"] = rul_test.index + 1

train["RUL"] = train.groupby("unit")["cycle"].transform("max") - train["cycle"]
train["y"] = (train["RUL"] <= W).astype(int)
last_cycle = test.groupby("unit")["cycle"].transform("max")
test["RUL"] = (last_cycle - test["cycle"]) + test["unit"].map(rul_test.set_index("unit")["RUL"])
test["y"] = (test["RUL"] <= W).astype(int)

FEATURES_14 = ["s2", "s3", "s4", "s7", "s8", "s9", "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21"]
FEATURES_12 = [s for s in FEATURES_14 if s not in ("s9", "s14")]
FEATURES = FEATURES_14
y_train, groups = train["y"], train["unit"]
test_last = test.groupby("unit").tail(1)

assert len(train) == 20631 and train["y"].sum() == 3100 and len(test) == 13096
assert len(test_last) == 100 and test_last["y"].sum() == 25


# ---------------------------------------------------------------- protocol (notebook section 13.2)
def get_score(model, X):
    return model.predict_proba(X)[:, 1] if hasattr(model, "predict_proba") else model.decision_function(X)


def default_threshold(model):
    return 0.5 if hasattr(model, "predict_proba") else 0.0


def metrics(y_true, score, threshold):
    pred = (score >= threshold).astype(int)
    return {"accuracy": accuracy_score(y_true, pred), "recall": recall_score(y_true, pred),
            "precision": precision_score(y_true, pred, zero_division=0), "f1": f1_score(y_true, pred, zero_division=0),
            "auc": roc_auc_score(y_true, score), "ap": average_precision_score(y_true, score)}


def cross_validate(model, features, seed=SEED):
    splitter = GroupKFold(n_splits=N_FOLDS, shuffle=True, random_state=seed)
    oof, rows = np.zeros(len(train)), []
    for fit_idx, val_idx in splitter.split(train, y_train, groups):
        fitted = clone(model).fit(train.iloc[fit_idx][features], y_train.iloc[fit_idx])
        score = get_score(fitted, train.iloc[val_idx][features])
        oof[val_idx] = score
        rows.append(metrics(y_train.iloc[val_idx], score, default_threshold(fitted)))
    return pd.DataFrame(rows), oof


def make_models(class_weight="balanced"):
    scaled = lambda model: Pipeline([("scale", StandardScaler()), ("clf", model)])
    return {
        "Logistic regression": scaled(LogisticRegression(class_weight=class_weight, max_iter=1000)),
        "Naive Bayes": scaled(GaussianNB()),
        "k-NN": scaled(KNeighborsClassifier(n_neighbors=25)),
        "SVM (RBF)": scaled(SVC(kernel="rbf", class_weight=class_weight)),
        "Decision tree": DecisionTreeClassifier(max_depth=6, class_weight=class_weight, random_state=SEED),
        "Random forest": RandomForestClassifier(n_estimators=200, min_samples_leaf=5, class_weight=class_weight,
                                                n_jobs=-1, random_state=SEED),
        "Gradient boosting": HistGradientBoostingClassifier(class_weight=class_weight, random_state=SEED),
    }


def r4(x):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), 4)


start = time.time()
models = make_models()

# ---------------------------------------------------------------- exploration: lifetimes, sensors, wear
lifetimes = train.groupby("unit")["cycle"].max()

z = (train[SENSORS] - train[SENSORS].mean()) / train[SENSORS].std().replace(0, np.nan)
modal_share = {s: train[s].value_counts(normalize=True).iloc[0] for s in SENSORS}

HORIZON = 200
near = train["RUL"] <= HORIZON
sensors, trajectories = [], {}
for s in SENSORS:
    symbol, name = SENSOR_INFO[s]
    kept = s in FEATURES_14
    entry = {"id": s, "symbol": symbol, "name": name, "kept": kept, "modalShare": r4(modal_share[s])}
    if kept:
        r = train[s].corr(train["RUL"])
        gap = z.loc[train["y"] == 1, s].mean() - z.loc[train["y"] == 0, s].mean()
        by_rul = z.loc[near, s].groupby(train.loc[near, "RUL"])
        mean = by_rul.mean()
        spark = mean.reindex(np.linspace(HORIZON, 0, 40).round().astype(int)).to_numpy()
        entry.update({"r": r4(r), "gap": r4(gap), "rises": bool(r < 0), "spark": [r4(v) for v in spark]})
        steps = np.arange(HORIZON, -1, -2)
        q10, q90 = by_rul.quantile(0.1), by_rul.quantile(0.9)
        trajectories[s] = [{"t": -int(t), "mean": r4(mean[t]), "lo": r4(q10[t]), "hi": r4(q90[t])} for t in steps]
    sensors.append(entry)

assert {e["id"] for e in sensors if not e["kept"]} == {"s1", "s5", "s6", "s10", "s16", "s18", "s19"}
assert abs(train["s11"].corr(train["RUL"]) + 0.70) < 0.01

# ---------------------------------------------------------------- baseline and model comparison (notebook sections 14, 15)
baseline_folds, _ = cross_validate(DummyClassifier(strategy="prior"), FEATURES)
baseline = baseline_folds.mean()
default_cv = {name: cross_validate(model, FEATURES)[0].mean() for name, model in models.items()}

# ---------------------------------------------------------------- s9 and s14 (notebook section 16)
tested = ["Logistic regression", "Naive Bayes", "k-NN", "Random forest", "Gradient boosting"]
feature_test = []
for name in tested:
    diffs = []
    for seed in [0, 1, 2]:
        a14 = cross_validate(models[name], FEATURES_14, seed=seed)[0]["ap"]
        a12 = cross_validate(models[name], FEATURES_12, seed=seed)[0]["ap"]
        diffs.extend((a12 - a14).tolist())
    diffs = np.array(diffs)
    feature_test.append({"model": name, "diff": r4(diffs.mean()), "better": int((diffs > 0).sum()), "folds": len(diffs)})
print(f"[{time.time() - start:5.0f}s] s9/s14 test done")

# ---------------------------------------------------------------- tuning (notebook section 18)
grids = {
    "Logistic regression": {"clf__C": [0.01, 0.1, 1, 10, 100]},
    "Naive Bayes": {"clf__var_smoothing": [1e-9, 1e-6, 1e-3, 1e-1]},
    "k-NN": {"clf__n_neighbors": [5, 15, 25, 50, 100], "clf__weights": ["uniform", "distance"]},
    "SVM (RBF)": {"clf__C": [0.1, 1, 10], "clf__gamma": [0.01, 0.03, 0.1]},
    "Decision tree": {"max_depth": [3, 5, 8], "min_samples_leaf": [20, 100]},
    "Random forest": {"min_samples_leaf": [5, 20, 50], "max_features": ["sqrt", 0.5]},
    "Gradient boosting": {"learning_rate": [0.03, 0.1], "max_leaf_nodes": [8, 31], "l2_regularization": [0.0, 10.0]},
}
search_cv = GroupKFold(n_splits=N_FOLDS, shuffle=True, random_state=SEED)
tuned, best_params = {}, {}
for name, grid in grids.items():
    search = GridSearchCV(models[name], grid, scoring="average_precision", cv=search_cv, n_jobs=-1, refit=False)
    search.fit(train[FEATURES], y_train, groups=groups)
    tuned[name] = clone(models[name]).set_params(**search.best_params_)
    best_params[name] = {k.split("__")[-1]: v for k, v in search.best_params_.items()}
print(f"[{time.time() - start:5.0f}s] grid search done")

reeval, reeval_std, tuned_oof = {}, {}, {}
for name in models:
    for label, model in [("default", models[name]), ("tuned", tuned[name])]:
        folds = []
        for seed in [1, 2]:
            f, oof = cross_validate(model, FEATURES, seed=seed)
            folds.append(f)
            if label == "tuned" and seed == 1:
                tuned_oof[name] = oof
        reeval[(name, label)] = pd.concat(folds).mean()
        reeval_std[(name, label)] = pd.concat(folds).std()
print(f"[{time.time() - start:5.0f}s] re-evaluation done")

SIMPLICITY = ["Logistic regression", "Naive Bayes", "Decision tree", "k-NN", "SVM (RBF)", "Random forest",
              "Gradient boosting"]
best_ap = max(reeval[(n, "tuned")]["ap"] for n in models)
CHOSEN = [n for n in SIMPLICITY if reeval[(n, "tuned")]["ap"] >= best_ap - 0.005][0]
assert CHOSEN == "Logistic regression"

# ---------------------------------------------------------------- threshold (notebook section 19.2)
oof = tuned_oof[CHOSEN]
precision, recall, thresholds = precision_recall_curve(y_train, oof)
f2 = 5 * precision[:-1] * recall[:-1] / np.maximum(4 * precision[:-1] + recall[:-1], 1e-12)
THRESHOLD = float(thresholds[np.argmax(f2)])
assert abs(THRESHOLD - 0.592) < 0.001, THRESHOLD

curve = []
for t in np.round(np.linspace(0.02, 0.98, 49), 2):
    pred = (oof >= t).astype(int)
    p, r = precision_score(y_train, pred, zero_division=0), recall_score(y_train, pred)
    curve.append({"t": float(t), "recall": r4(r), "precision": r4(p), "f2": r4(5 * p * r / max(4 * p + r, 1e-12))})

# ---------------------------------------------------------------- test engines (notebook sections 20, 21)
# The model saved by the notebook (section 20.1) is the one every chart and the website use
assert MODEL_FILE.exists(), "Run nasa_fd001_predictive_maintenance.ipynb first: it saves the model to models/"
final = joblib.load(MODEL_FILE)
card = json.loads(MODEL_CARD.read_text())
assert card["features"] == FEATURES and abs(card["threshold"] - THRESHOLD) < 1e-12
refit = clone(tuned[CHOSEN]).fit(train[FEATURES], y_train)
assert np.abs(refit.predict_proba(test[FEATURES])[:, 1] - final.predict_proba(test[FEATURES])[:, 1]).max() < 1e-9
score = get_score(final, test_last[FEATURES])
truth = test_last["y"].to_numpy()
alarm = score >= THRESHOLD
tp, fn = int((alarm & (truth == 1)).sum()), int((~alarm & (truth == 1)).sum())
fp, tn = int((alarm & (truth == 0)).sum()), int((~alarm & (truth == 0)).sum())
assert (tp, fn, fp, tn) == (21, 4, 3, 72), (tp, fn, fp, tn)
at_default = score >= 0.5
assert int((at_default & (truth == 1)).sum()) == 22 and int((at_default & (truth == 0)).sum()) == 5
test_metrics = metrics(truth, score, THRESHOLD)

rng = np.random.default_rng(SEED)
boot = []
for _ in range(2000):
    idx = rng.integers(0, len(truth), len(truth))
    if truth[idx].min() == truth[idx].max():
        continue
    boot.append(metrics(truth[idx], score[idx], THRESHOLD))
boot = pd.DataFrame(boot)

all_scores = get_score(final, test[FEATURES])
band_edges = [-1, 10, 20, 30, 40, 50, 75, 100, 400]
band_labels = ["0–10", "11–20", "21–30", "31–40", "41–50", "51–75", "76–100", ">100"]
bands = pd.cut(test["RUL"], bins=band_edges, labels=band_labels)
profile = pd.DataFrame({"alarm": (all_scores >= THRESHOLD).astype(int), "band": bands}) \
    .groupby("band", observed=True)["alarm"].agg(["mean", "size"])
assert abs(profile.loc["0–10", "mean"] - 1.0) < 1e-9 and abs(profile.loc["31–40", "mean"] - 0.322) < 0.001

coef = final.named_steps["clf"].coef_[0]
perm = permutation_importance(final, test[FEATURES], test["y"], scoring="average_precision", n_repeats=10, random_state=SEED)
importance = [{"id": s, "symbol": SENSOR_INFO[s][0], "r": r4(train[s].corr(train["RUL"])), "coef": r4(c),
               "drop": r4(d), "dropStd": r4(e)}
              for s, c, d, e in zip(FEATURES, coef, perm.importances_mean, perm.importances_std)]
assert sorted(importance, key=lambda e: -e["drop"])[0]["id"] in ("s9", "s14")

ORDER = ["s11", "s4", "s15", "s2", "s17", "s3", "s8", "s13", "s12", "s7", "s21", "s20", "s9", "s14"]
corr = train[ORDER].corr()
assert abs(corr.loc["s9", "s14"] - 0.96) < 0.01

EDGES = np.arange(-4, 5.01, 0.25)
hist = {}
for f in FEATURES:
    zf = z[f]
    h0, _ = np.histogram(zf[train["y"] == 0], bins=EDGES)
    h1, _ = np.histogram(zf[train["y"] == 1], bins=EDGES)
    hist[f] = {"healthy": [r4(v) for v in h0 / h0.sum()], "imminent": [r4(v) for v in h1 / h1.sum()]}

test_scores = {}
for name, model in tuned.items():
    fitted_model = final if name == CHOSEN else clone(model).fit(train[FEATURES], y_train)
    test_scores[name] = [round(float(v), 5) for v in get_score(fitted_model, test_last[FEATURES])]

# ---------------------------------------------------------------- the model and a data generator for the browser
z_card = (test[FEATURES].to_numpy() - np.array(card["mean"])) / np.array(card["scale"])
by_hand = 1 / (1 + np.exp(-(z_card @ np.array(card["coef"]) + card["intercept"])))
assert np.abs(by_hand - final.predict_proba(test[FEATURES])[:, 1]).max() < 1e-12

GEN_MAX = 250
gen_rows = train[train["RUL"] <= GEN_MAX]
grid = pd.Index(np.arange(0, GEN_MAX + 1), name="RUL")
smooth = lambda frame: frame.reindex(grid).interpolate().rolling(9, center=True, min_periods=1).mean()
gen_mean = smooth(gen_rows.groupby("RUL")[FEATURES].mean())
gen_std = smooth(gen_rows.groupby("RUL")[FEATURES].std())
resid = (gen_rows[FEATURES] - gen_mean.loc[gen_rows["RUL"]].to_numpy()) / gen_std.loc[gen_rows["RUL"]].to_numpy()
gen_corr = np.corrcoef(resid.to_numpy().T)
chol = np.linalg.cholesky(gen_corr + 1e-9 * np.eye(len(FEATURES)))
lagged = resid.assign(unit=gen_rows["unit"].to_numpy()).groupby("unit")[FEATURES].shift(1)
rho = float(np.nanmean([resid[f].corr(lagged[f]) for f in FEATURES]))

rng_gen = np.random.default_rng(SEED)
check = []
for lo, hi in [(0, 10), (11, 20), (21, 30), (31, 40), (41, 50), (51, 75), (76, 100), (101, 150)]:
    ruls = rng_gen.integers(lo, hi + 1, 4000)
    zs = rng_gen.standard_normal((len(ruls), len(FEATURES))) @ chol.T
    xs = gen_mean.loc[ruls].to_numpy() + gen_std.loc[ruls].to_numpy() * zs
    check.append(float((final.predict_proba(pd.DataFrame(xs, columns=FEATURES))[:, 1] >= THRESHOLD).mean()))
train_alarm = final.predict_proba(train[FEATURES])[:, 1] >= THRESHOLD
real = [float(train_alarm[(train["RUL"] >= lo) & (train["RUL"] <= hi)].mean())
        for lo, hi in [(0, 10), (11, 20), (21, 30), (31, 40), (41, 50), (51, 75), (76, 100), (101, 150)]]
print("alarm share by band, generated:", [round(v, 3) for v in check])
print("alarm share by band, training :", [round(v, 3) for v in real])
assert max(abs(g - r) for g, r in zip(check, real)) < 0.06

generator_json = {"max": GEN_MAX, "rho": round(rho, 4),
                  "mean": [[round(float(v), 4) for v in row] for row in gen_mean.to_numpy()],
                  "std": [[round(float(v), 5) for v in row] for row in gen_std.to_numpy()],
                  "chol": [[round(float(v), 6) for v in row] for row in chol],
                  "check": [round(v, 4) for v in check], "real": [round(v, 4) for v in real]}

AGING_HORIZON = 150
aging = []
for unit, rows in test.assign(score=all_scores).groupby("unit"):
    rows = rows[rows["RUL"] <= AGING_HORIZON]
    aging.append({"unit": int(unit), "end": int(rows["RUL"].min()) if len(rows) else None,
                  "pts": [[int(r), round(float(v), 3)] for r, v in zip(rows["RUL"], rows["score"])]})

print(f"[{time.time() - start:5.0f}s] test done")

# ---------------------------------------------------------------- export
SHORT = {"Logistic regression": "Logistic reg.", "Naive Bayes": "Naive Bayes", "k-NN": "k-NN", "SVM (RBF)": "SVM",
         "Decision tree": "Decision tree", "Random forest": "Random forest", "Gradient boosting": "Grad. boosting"}
model_rows = []
for name in models:
    d, t = reeval[(name, "default")], reeval[(name, "tuned")]
    model_rows.append({
        "name": name, "short": SHORT[name], "chosen": name == CHOSEN,
        "default": {m: r4(d[m]) for m in ["recall", "precision", "f1", "auc", "ap"]},
        "tuned": {m: r4(t[m]) for m in ["recall", "precision", "f1", "auc", "ap"]},
        "firstLook": {m: r4(default_cv[name][m]) for m in ["recall", "precision", "f1", "auc", "ap"]},
        "params": best_params[name],
        "apStd": r4(reeval_std[(name, "tuned")]["ap"]),
    })
model_rows.sort(key=lambda m: -m["tuned"]["ap"])

data = {
    "meta": {"window": W, "trainRows": len(train), "testRows": len(test), "engines": int(train["unit"].nunique()),
             "positives": int(train["y"].sum()), "positiveShare": r4(train["y"].mean()),
             "chosen": CHOSEN, "threshold": round(THRESHOLD, 6), "features": FEATURES},
    "lifetimes": [{"unit": int(u), "life": int(l)} for u, l in lifetimes.sort_values().items()],
    "sensors": sensors,
    "trajectories": trajectories,
    "baseline": {m: r4(baseline[m]) for m in ["accuracy", "recall", "auc", "ap"]},
    "models": model_rows,
    "featureTest": feature_test,
    "threshold": {"chosen": round(THRESHOLD, 6), "default": 0.5, "curve": curve},
    "test": [{"unit": int(u), "rul": int(r), "y": int(y), "score": round(float(s), 6)}
             for u, r, y, s in zip(test_last["unit"], test_last["RUL"], test_last["y"], score)],
    "testMetrics": {m: r4(v) for m, v in test_metrics.items()},
    "ci": {m: [r4(boot[m].quantile(0.025)), r4(boot[m].quantile(0.975))] for m in ["recall", "precision", "f1", "auc", "ap"]},
    "importance": importance,
    "corr": {"ids": ORDER, "symbols": [SENSOR_INFO[s][0] for s in ORDER], "r": [[r4(v) for v in row] for row in corr.to_numpy()]},
    "hist": {"edges": [float(e) for e in EDGES], "sensors": hist},
    "testScores": test_scores,
    "generator": generator_json,
    "aging": aging,
    "bands": [{"band": b, "share": r4(row["mean"]), "rows": int(row["size"]), "imminent": i < 3}
              for i, (b, row) in enumerate(profile.iterrows())],
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, separators=(",", ":")))

print(f"\nWrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB) in {time.time() - start:.0f}s")
print(f"Chosen: {CHOSEN} {best_params[CHOSEN]}, threshold {THRESHOLD:.3f}")
print(f"Test: TP {tp}  FN {fn}  FP {fp}  TN {tn}  | " +
      "  ".join(f"{m} {v:.3f}" for m, v in test_metrics.items() if m != "accuracy"))
for m in model_rows:
    print(f"  {m['name']:<20} AP default {m['default']['ap']:.3f}  tuned {m['tuned']['ap']:.3f}")
