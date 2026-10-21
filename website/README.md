# FD001 website

A one-page visual summary of [the merged notebook](../nasa_fd001_predictive_maintenance.ipynb): the engine, the data, the models and the results.

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `npm run build` writes a static site to `dist/`.

## Where the numbers come from

1. **The notebook trains and saves the model.** Section 20.1 of [the notebook](../nasa_fd001_predictive_maintenance.ipynb) writes the chosen logistic regression to `../models/`: `fd001_logistic_regression.joblib` (reload it in Python with `joblib.load`) and `fd001_logistic_regression.json` (the scaler means and scales, the 14 weights, the intercept and the alarm threshold).
2. **The website uses that model as is.** The “Try it” section imports `../models/fd001_logistic_regression.json` and applies it in the browser; it gives the same probabilities as `predict_proba`.
3. **The charts read `src/data/fd001.json`.** To rebuild it from the raw C-MAPSS files after running the notebook (about 4 minutes, needs pandas and scikit-learn):

```bash
npm run data
```

The script loads the model saved by the notebook, recomputes the analysis behind each chart and stops if a checked number differs from the reference results.

Built with React, Tailwind, [EvilCharts](https://evilcharts.com) (Recharts) and the Turbofan figure from [Anatomy](https://github.com/wheresryan22/anatomy) (MIT).

Published at https://website-snowy-eight.vercel.app. Vercel deploys pushes to `main`
from the connected GitHub repository, using `website/` as the root directory,
`npm run build` as the build command, and `dist/` as the output directory. The build
reads `../models/`, so keep `models/` committed and keep Vercel's “Include files outside
the root directory” option on.
