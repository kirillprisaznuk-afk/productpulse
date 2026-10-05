"""Optional independent oracle; run only in an isolated Statsmodels/SciPy environment.

Reference versions: statsmodels==0.14.5 scipy==1.16.2 numpy==2.3.3.
Neither the application nor its normal test suite requires these packages.
"""

import json
from pathlib import Path

import numpy
import scipy
import statsmodels
from scipy.optimize import brentq
from scipy.stats import chisquare
from statsmodels.stats.proportion import (
    confint_proportions_2indep,
    proportions_ztest,
    samplesize_proportions_2indep_onetail,
)


def main():
    reference = {
        "versions": {
            "statsmodels": statsmodels.__version__,
            "scipy": scipy.__version__,
            "numpy": numpy.__version__,
        },
        "inference": [],
        "sample_size": [],
        "mde": [],
        "srm": [],
    }
    for cc, cn, tc, tn in [
        (100, 1000, 140, 1000),
        (20, 100, 22, 100),
        (140, 1000, 100, 1000),
        (100, 1000, 100, 1000),
        (0, 100, 0, 100),
        (100, 100, 100, 100),
        (0, 100, 20, 100),
        (312, 900, 405, 1100),
    ]:
        low, high = confint_proportions_2indep(tc, tn, cc, cn, method="newcomb", alpha=0.05)
        z, p = (
            (None, None)
            if cc + tc in (0, cn + tn)
            else proportions_ztest([tc, cc], [tn, cn], alternative="two-sided")
        )
        reference["inference"].append(
            dict(
                control_successes=cc,
                control_n=cn,
                treatment_successes=tc,
                treatment_n=tn,
                z=z,
                p=p,
                lower=low,
                upper=high,
            )
        )
    for baseline, delta, alpha, target in [
        (0.1, 0.02, 0.05, 0.8),
        (0.5, 0.03, 0.01, 0.9),
        (0.02, 0.01, 0.1, 0.8),
    ]:
        n = samplesize_proportions_2indep_onetail(delta, baseline, target, alpha=alpha)
        reference["sample_size"].append(
            dict(baseline=baseline, delta=delta, alpha=alpha, target_power=target, raw_n=n)
        )
    for baseline, n in [(0.1, 1000), (0.5, 4000), (0.9, 100)]:
        root = brentq(
            lambda d, baseline=baseline, n=n: samplesize_proportions_2indep_onetail(
                d, baseline, 0.8, alpha=0.05
            )
            - n,
            1e-10,
            1 - baseline,
            xtol=1e-14,
        )
        reference["mde"].append(dict(baseline=baseline, n=n, absolute_mde=root))
    for control, treatment in [(1000, 1000), (900, 100), (3844, 3968)]:
        statistic, p = chisquare([control, treatment])
        reference["srm"].append(
            dict(control=control, treatment=treatment, statistic=statistic, p=p)
        )
    destination = (
        Path(__file__).resolve().parents[1] / "backend/tests/fixtures/statistical_references.json"
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(reference, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
