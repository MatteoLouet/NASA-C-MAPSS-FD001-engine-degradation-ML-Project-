# NASA C-MAPSS FD001 predictive maintenance

[nasa_fd001_predictive_maintenance.ipynb](nasa_fd001_predictive_maintenance.ipynb) is the single working notebook for data exploration, modelling and evaluation. It combines the previous two notebooks into one workflow, with one setup, one data-loading step, shared labels and continuously numbered sections.

The task is to identify engines with at most 30 cycles of remaining useful life. The notebook explores the raw FD001 files, compares seven classifiers using validation grouped by engine, tests the sensor set and class weights, tunes the models, selects an alarm threshold, and evaluates on the last recorded row of each test engine.

## Run the notebook

Use Python 3.11–3.13. The dependency versions in `requirements.txt` match the environment used to verify the combined notebook.

```bash
python -m pip install -r requirements.txt
```

Open the notebook in your Jupyter-compatible editor, select that Python environment, restart the kernel and run all cells from the repository root. The full workflow includes repeated cross-validation and grid searches and takes several minutes.

To execute and refresh the HTML preview from the command line:

```bash
python -m jupyter nbconvert --execute --to notebook --inplace --ExecutePreprocessor.timeout=900 nasa_fd001_predictive_maintenance.ipynb
python -m jupyter nbconvert --to html nasa_fd001_predictive_maintenance.ipynb
```

The data is already included under `cmapss_nasa_turbo_engine_6_data/CMAPSSData/`. The notebook also resolves this folder when started from a repository subdirectory. The HTML preview contains the same text, tables and interactive Plotly figures as the notebook.

## Continue the work

Change the warning window, random seeds, fold count, bootstrap count and CPU parallelism in section 0. Sections 1–12 explore the data; section 13 carries the prepared data into modelling; sections 14–22 train and evaluate; section 23 records the next experiments and the objects available to continue.

For new engineered features, pass a training dataframe containing the features, `unit` and `y` to `cross_validate(model, features, data=...)`. Compute rolling features separately for each engine using only current and earlier cycles. Keep feature selection and threshold selection on training validation; this test set has already been inspected.

Saved interpretations describe the reference configuration. Review them after changing the data, features or parameters and rerunning the notebook.

The [website](website/README.md) presents a visual summary of the same workflow. The previous separate notebooks and exports remain available in Git history.
