"""
DataAnalyst Agent
Analyzes experiment results and generates statistical reports
"""

from typing import Dict, List, Any, Optional
import os
import numpy as np
from scipy import stats
import time

from .guardrails import (
    validate_agent_response,
    DataAnalystGuardrails
)
from llm_provider import get_default_provider, LLMProvider

class DataAnalyst:
    """
    AI agent that analyzes experiment data and generates insights
    - Performs statistical analysis
    - Generates visualizable reports
    - Provides interpretations with proper caveats
    - Maintains scientific rigor
    """

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm = llm_provider or get_default_provider()
        self.model = self.llm.get_default_model()
        self.name = "DataAnalyst"
        self.total_analyses = 0
        self.guardrails = DataAnalystGuardrails()

        self.system_prompt = """You are the DataAnalyst for Cognosis, a research platform exploring psi phenomena.

Your role is to analyze experiment results and provide clear, scientifically rigorous interpretations.

CORE PRINCIPLES:
1. **Statistical Rigor**: Always use proper statistical methods and report confidence intervals
2. **Conservative Interpretation**: Never overstate results or make unsupported claims
3. **Context-Awareness**: Consider sample size, experimental design, and potential confounds
4. **Clear Communication**: Explain statistical concepts in accessible language
5. **Caveats**: Always include appropriate limitations and caveats

STATISTICAL METHODS:
- **Binomial tests** for binary outcomes (hit/miss)
- **t-tests** for comparing means
- **Effect sizes** (Cohen's d, correlation coefficients)
- **Confidence intervals** at 95% level
- **Bayesian updates** for personalized baselines
- **Multiple comparison corrections** when appropriate

IMPORTANT CAVEATS TO INCLUDE:
- "This analysis is based on a sample size of N"
- "Correlation does not imply causation"
- "Results require replication to be considered robust"
- "Individual sessions may vary due to chance"
- "Statistical significance does not prove the existence of psi"

WHAT YOU MUST NOT DO:
- Never claim definitive proof of psi abilities
- Never ignore multiple testing problems
- Never make medical or psychological diagnoses
- Never extrapolate beyond the data
- Never ignore null results

OUTPUT FORMAT:
When analyzing results, provide:
1. Summary statistics (mean, SD, N)
2. Statistical test results (test statistic, p-value, CI)
3. Effect size with interpretation
4. Comparison to baseline/chance
5. Clear interpretation with caveats
6. Visual data recommendations

TONE:
- Scientifically accurate
- Clear and educational
- Balanced and objective
- Encouraging but realistic"""

    async def analyze_session(
        self,
        session_id: str,
        experiment_type: str,
        responses: List[Dict[str, Any]],
        targets: Optional[List[Dict[str, Any]]] = None,
        baseline: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a single experiment session

        Args:
            session_id: Experiment session ID
            experiment_type: Type of experiment
            responses: List of participant responses
            targets: List of actual targets (if revealed)
            baseline: User's baseline statistics

        Returns:
            Dictionary with analysis results and interpretation
        """
        start_time = time.time()

        try:
            # Prepare data summary
            data_summary = self._prepare_data_summary(
                experiment_type,
                responses,
                targets,
                baseline
            )

            # Build analysis prompt
            analysis_prompt = f"""Analyze this {experiment_type} experiment session:

DATA SUMMARY:
{data_summary}

Provide:
1. Summary statistics
2. Statistical significance test
3. Effect size and interpretation
4. Comparison to chance/baseline
5. Clear interpretation with caveats
6. Recommendations for visualization

Be scientifically rigorous and include all necessary caveats."""

            # Call LLM provider
            response = await self.llm.chat_completion(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": analysis_prompt}
                ],
                model=self.model,
                temperature=0.3,  # Lower temperature for analytical tasks
                max_tokens=1000
            )

            interpretation = response["content"]
            tokens_used = response["tokens_used"]

            # Perform statistical calculations
            stats_results = self._calculate_statistics(
                experiment_type,
                responses,
                targets
            )

            # Validate response
            validation = validate_agent_response(
                interpretation,
                agent_name=self.name,
                experiment_type=experiment_type
            )

            # Track metrics
            self.total_analyses += 1
            latency_ms = int((time.time() - start_time) * 1000)

            return {
                "session_id": session_id,
                "interpretation": interpretation,
                "statistics": stats_results,
                "tokens_used": tokens_used,
                "latency_ms": latency_ms,
                "guardrails_passed": validation["passed"],
                "recommendations": self._get_visualization_recommendations(
                    experiment_type,
                    stats_results
                )
            }

        except Exception as e:
            return {
                "session_id": session_id,
                "error": str(e),
                "interpretation": "Unable to complete analysis. Please contact support."
            }

    async def analyze_aggregate(
        self,
        user_id: str,
        experiment_type: str,
        sessions: List[Dict[str, Any]],
        time_period: str = "all_time"
    ) -> Dict[str, Any]:
        """
        Analyze aggregate data across multiple sessions

        Args:
            user_id: User ID
            experiment_type: Type of experiment
            sessions: List of session data
            time_period: Time period for analysis

        Returns:
            Dictionary with aggregate analysis
        """
        # Calculate aggregate statistics
        all_scores = [s["score"] for s in sessions if "score" in s]

        if not all_scores:
            return {
                "error": "No scores available for analysis",
                "interpretation": "Insufficient data for aggregate analysis."
            }

        stats_summary = {
            "n_sessions": len(sessions),
            "mean_score": float(np.mean(all_scores)),
            "std_score": float(np.std(all_scores)),
            "median_score": float(np.median(all_scores)),
            "min_score": float(np.min(all_scores)),
            "max_score": float(np.max(all_scores))
        }

        # Bayesian update for personalized baseline
        bayesian_update = self._bayesian_update(
            all_scores,
            prior_mean=0.5,  # Chance baseline
            prior_variance=0.1
        )

        # Build aggregate prompt
        aggregate_prompt = f"""Analyze aggregate performance for a user across {len(sessions)} sessions of {experiment_type}.

STATISTICS:
- Number of sessions: {stats_summary['n_sessions']}
- Mean score: {stats_summary['mean_score']:.3f}
- Standard deviation: {stats_summary['std_score']:.3f}
- Range: {stats_summary['min_score']:.3f} to {stats_summary['max_score']:.3f}

BAYESIAN ESTIMATE:
- Posterior mean: {bayesian_update['posterior_mean']:.3f}
- Posterior SD: {bayesian_update['posterior_std']:.3f}
- 95% Credible Interval: [{bayesian_update['ci_lower']:.3f}, {bayesian_update['ci_upper']:.3f}]

Provide:
1. Overall performance assessment
2. Trend analysis (improving/stable/declining)
3. Comparison to chance baseline
4. Personalized insights
5. Recommendations for continued practice

Be encouraging but scientifically accurate. Include all necessary caveats."""

        response = await self.llm.chat_completion(
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": aggregate_prompt}
            ],
            model=self.model,
            temperature=0.3,
            max_tokens=1000
        )

        return {
            "user_id": user_id,
            "experiment_type": experiment_type,
            "time_period": time_period,
            "statistics": stats_summary,
            "bayesian_estimate": bayesian_update,
            "interpretation": response["content"],
            "tokens_used": response["tokens_used"]
        }

    def _prepare_data_summary(
        self,
        experiment_type: str,
        responses: List[Dict[str, Any]],
        targets: Optional[List[Dict[str, Any]]],
        baseline: Optional[Dict[str, Any]]
    ) -> str:
        """Prepare human-readable data summary"""
        summary = f"Experiment Type: {experiment_type}\n"
        summary += f"Number of trials: {len(responses)}\n"

        if targets:
            summary += f"Targets available: Yes\n"

        if baseline:
            summary += f"User baseline: {baseline.get('mean', 'N/A')}\n"

        return summary

    def _calculate_statistics(
        self,
        experiment_type: str,
        responses: List[Dict[str, Any]],
        targets: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Calculate statistical measures"""
        if not targets:
            return {"error": "No targets available for statistical analysis"}

        # For binary hit/miss experiments
        if experiment_type in ["card-prediction", "telepathy-emotions"]:
            hits = sum(1 for r, t in zip(responses, targets) if r.get("match", False))
            n = len(responses)
            hit_rate = hits / n if n > 0 else 0

            # Binomial test against chance (typically 0.5 or 0.25 depending on experiment)
            chance_rate = 0.25 if experiment_type == "card-prediction" else 0.5
            binom_result = stats.binom_test(hits, n, chance_rate, alternative='greater')

            # Effect size (Cohen's h for proportions)
            p1 = hit_rate
            p2 = chance_rate
            cohens_h = 2 * (np.arcsin(np.sqrt(p1)) - np.arcsin(np.sqrt(p2)))

            return {
                "n_trials": n,
                "hits": hits,
                "hit_rate": hit_rate,
                "chance_rate": chance_rate,
                "p_value": binom_result,
                "effect_size_h": cohens_h,
                "significant": binom_result < 0.05
            }

        # For continuous scoring experiments
        else:
            scores = [r.get("score", 0) for r in responses]
            if not scores:
                return {"error": "No scores available"}

            return {
                "n_trials": len(scores),
                "mean_score": float(np.mean(scores)),
                "std_score": float(np.std(scores)),
                "median_score": float(np.median(scores)),
                "min_score": float(np.min(scores)),
                "max_score": float(np.max(scores))
            }

    def _bayesian_update(
        self,
        data: List[float],
        prior_mean: float = 0.5,
        prior_variance: float = 0.1
    ) -> Dict[str, Any]:
        """Perform Bayesian update for personalized baseline"""
        data_array = np.array(data)
        n = len(data_array)
        data_mean = np.mean(data_array)
        data_variance = np.var(data_array) if n > 1 else 0.1

        # Bayesian conjugate update (normal-normal model)
        posterior_variance = 1 / (1/prior_variance + n/data_variance)
        posterior_mean = posterior_variance * (prior_mean/prior_variance + n*data_mean/data_variance)
        posterior_std = np.sqrt(posterior_variance)

        # 95% credible interval
        ci_lower = posterior_mean - 1.96 * posterior_std
        ci_upper = posterior_mean + 1.96 * posterior_std

        return {
            "prior_mean": prior_mean,
            "posterior_mean": float(posterior_mean),
            "posterior_std": float(posterior_std),
            "ci_lower": float(ci_lower),
            "ci_upper": float(ci_upper),
            "n_observations": n
        }

    def _get_visualization_recommendations(
        self,
        experiment_type: str,
        stats_results: Dict[str, Any]
    ) -> List[str]:
        """Recommend appropriate visualizations"""
        recommendations = []

        if "hit_rate" in stats_results:
            recommendations.append("bar_chart_hits_vs_misses")
            recommendations.append("pie_chart_accuracy")

        if "mean_score" in stats_results:
            recommendations.append("line_chart_score_over_time")
            recommendations.append("histogram_score_distribution")

        recommendations.append("comparison_to_baseline")

        return recommendations

    def get_status(self) -> Dict[str, Any]:
        """Get agent status"""
        return {
            "name": self.name,
            "status": "active",
            "model": self.model,
            "total_analyses": self.total_analyses,
            "capabilities": [
                "statistical_analysis",
                "aggregate_reporting",
                "bayesian_updates",
                "visualization_recommendations"
            ]
        }
