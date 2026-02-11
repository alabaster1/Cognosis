"""
Guardrails - Safety and validation for AI agents
Ensures agents follow scientific integrity and ethical guidelines
"""

from typing import Dict, List, Any
import re

class GuardrailViolation(Exception):
    """Exception raised when guardrails are violated"""
    pass

# ============================================
# CONTENT SAFETY RULES
# ============================================

PROHIBITED_PATTERNS = [
    # Medical claims
    r'\b(diagnose|cure|treat|therapy|medical|clinical)\b',
    # Financial advice
    r'\b(invest|investment|financial advice|guaranteed returns)\b',
    # Harmful content
    r'\b(harm|dangerous|illegal|explicit)\b',
    # Personal data requests
    r'\b(ssn|social security|credit card|password)\b',
]

REQUIRED_DISCLAIMERS = {
    "experimental": "This is an experimental research platform. Results are for research purposes only.",
    "not_medical": "This platform does not provide medical or psychological diagnosis or treatment.",
    "privacy": "Your data is encrypted and used only for research purposes."
}

# ============================================
# SCIENTIFIC INTEGRITY RULES
# ============================================

SCIENTIFIC_GUIDELINES = {
    "no_leading_questions": True,  # Avoid biasing participants
    "accurate_descriptions": True,  # Don't mislead about experiment
    "proper_consent": True,         # Always ensure informed consent
    "data_privacy": True,           # Protect participant data
    "no_false_claims": True,        # Don't make unsupported claims
}

# ============================================
# VALIDATION FUNCTIONS
# ============================================

def validate_message(message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Validate a message against guardrails

    Args:
        message: Message to validate
        context: Additional context for validation

    Returns:
        Dictionary with validation results
    """
    violations = []

    # Check prohibited patterns
    for pattern in PROHIBITED_PATTERNS:
        if re.search(pattern, message, re.IGNORECASE):
            violations.append(f"Prohibited content detected: {pattern}")

    # Check for personal data exposure
    if context and context.get("contains_pii"):
        violations.append("Message may contain personally identifiable information")

    # Check message length (prevent prompt injection)
    if len(message) > 10000:
        violations.append("Message exceeds maximum length (10,000 characters)")

    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "message": message
    }

def validate_agent_response(
    response: str,
    agent_name: str,
    experiment_type: str = None
) -> Dict[str, Any]:
    """
    Validate an agent's response before sending to user

    Args:
        response: Agent response to validate
        agent_name: Name of the agent
        experiment_type: Type of experiment (if applicable)

    Returns:
        Dictionary with validation results
    """
    violations = []

    # Check prohibited patterns
    for pattern in PROHIBITED_PATTERNS:
        if re.search(pattern, response, re.IGNORECASE):
            violations.append(f"Response contains prohibited content: {pattern}")

    # Ensure experimental disclaimer
    if experiment_type and "experimental" not in response.lower():
        # Agent should include disclaimers for experimental contexts
        pass  # Warning, not violation

    # Check for leading questions (ExperimentConductor specific)
    if agent_name == "experiment_conductor":
        leading_phrases = [
            r"you should see",
            r"you will feel",
            r"the correct answer is",
            r"most people see"
        ]
        for phrase in leading_phrases:
            if re.search(phrase, response, re.IGNORECASE):
                violations.append(f"Response contains leading language: {phrase}")

    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "response": response
    }

def validate_experiment_protocol(
    protocol: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validate an experiment protocol for scientific integrity

    Args:
        protocol: Experiment protocol to validate

    Returns:
        Dictionary with validation results
    """
    violations = []
    warnings = []

    # Required fields
    required_fields = ["name", "description", "steps", "consent_required"]
    for field in required_fields:
        if field not in protocol:
            violations.append(f"Missing required field: {field}")

    # Check consent requirement
    if not protocol.get("consent_required", False):
        warnings.append("Protocol does not require consent")

    # Check step validation
    if "steps" in protocol:
        for i, step in enumerate(protocol["steps"]):
            if not step.get("validation_rules"):
                warnings.append(f"Step {i+1} lacks validation rules")

    # Check for proper randomization
    if protocol.get("requires_randomization") and not protocol.get("randomization_method"):
        violations.append("Protocol requires randomization but no method specified")

    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "warnings": warnings,
        "protocol": protocol
    }

def get_safe_response_template(context: str) -> str:
    """
    Get a safe response template for various contexts

    Args:
        context: Context for the response

    Returns:
        Safe template string
    """
    templates = {
        "experiment_start": "Welcome to this experiment. Please read the following information carefully before proceeding.",
        "data_collection": "Please provide your response below. There are no right or wrong answers.",
        "experiment_complete": "Thank you for completing this experiment. Your data has been securely recorded.",
        "error": "We encountered an issue. Please contact support if this persists.",
    }

    return templates.get(context, "")

def check_data_privacy(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check if data contains potentially sensitive information

    Args:
        data: Data to check

    Returns:
        Dictionary with privacy check results
    """
    sensitive_keys = [
        "password", "ssn", "credit_card", "email", "phone",
        "address", "ip_address", "device_id"
    ]

    violations = []
    for key in data.keys():
        if any(sensitive in key.lower() for sensitive in sensitive_keys):
            violations.append(f"Data contains sensitive key: {key}")

    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "contains_pii": len(violations) > 0
    }

# ============================================
# AGENT-SPECIFIC GUARDRAILS
# ============================================

class ExperimentConductorGuardrails:
    """Specific guardrails for ExperimentConductor agent"""

    @staticmethod
    def validate_guidance(guidance: str, step: int) -> bool:
        """Ensure guidance doesn't bias participant"""
        prohibited = [
            "you should see",
            "the target is",
            "most people",
            "correct answer"
        ]
        return not any(p in guidance.lower() for p in prohibited)

    @staticmethod
    def validate_target_selection(target: Dict[str, Any]) -> bool:
        """Ensure target selection is properly randomized"""
        return "random_seed" in target and "selection_method" in target

class DataAnalystGuardrails:
    """Specific guardrails for DataAnalyst agent"""

    @staticmethod
    def validate_analysis(analysis: Dict[str, Any]) -> bool:
        """Ensure analysis doesn't make unsupported claims"""
        required_fields = ["statistical_test", "p_value", "confidence_interval"]
        return all(field in analysis for field in required_fields)

    @staticmethod
    def validate_report(report: str) -> bool:
        """Ensure report includes proper caveats"""
        required_phrases = ["correlation", "sample size"]
        return any(phrase in report.lower() for phrase in required_phrases)
