import requests
import json
import logging
import time
from typing import Optional, Dict, Any
from app.config import settings
from app.tools.nvidia_catalog import REASONING_MODELS

logger = logging.getLogger("wayfarer.llm")

# Statuses worth another attempt: the NVIDIA free tier answers 429/503 under
# load ("Worker local total request limit reached"), and 5xx are transient.
RETRYABLE_STATUS = {408, 409, 425, 429, 500, 502, 503, 504}

# Reasoning models spend their completion budget thinking *before* emitting a
# single token of answer — measured on stepfun-ai/step-3.7-flash, ~3.7k chars of
# monologue for a report request. Without headroom they hit the cap mid-thought
# and return nothing usable, so give them a multiple of the caller's ask.
REASONING_HEADROOM = 3
MAX_TOKEN_CEILING = 32000

# The static list only covers NVIDIA's catalogue. Local GGUF builds reason too
# (the Gemma-4-E4B build on llama-server does), and NVIDIA adds models faster
# than any hardcoded list tracks. So remember any model observed emitting a
# reasoning channel and grant it headroom on subsequent calls.
_LEARNED_REASONING = set()


def _is_reasoning_model(model: str) -> bool:
    return model in REASONING_MODELS or model in _LEARNED_REASONING


class LLMError(RuntimeError):
    """Raised when a cloud provider could not produce a completion.

    Deliberately *not* swallowed by the mock fallback: if the user explicitly
    picked a cloud endpoint, quietly handing back canned text would look like a
    successful run and hide a broken key, a bad model id or a rate limit.
    """


def _retry_after_seconds(response, default: float) -> float:
    """Honour a Retry-After header when the endpoint sends one."""
    raw = response.headers.get("Retry-After")
    if not raw:
        return default
    try:
        return max(0.0, min(float(raw), 30.0))
    except (TypeError, ValueError):
        return default


def _consume_stream(response) -> Dict[str, Any]:
    """Accumulate an OpenAI-style SSE stream into a single string.

    Streaming matters for more than responsiveness here: a non-streamed request
    for a 4000-token report has to survive one long silence, so any read timeout
    short enough to catch a dead endpoint also kills legitimate long writes.
    With a stream the timeout applies between chunks instead.

    Reasoning models stream their thinking on `reasoning_content` and the answer
    on `content`, so both are tracked separately — along with finish_reason,
    which is what tells us whether an empty `content` means "the answer lives in
    the reasoning channel" or "we ran out of tokens mid-thought".
    """
    content_parts = []
    reasoning_parts = []
    finish_reason = None

    # requests falls back to ISO-8859-1 when a response omits a charset, which
    # SSE responses routinely do. Decoding UTF-8 bytes as latin-1 turns every
    # em-dash into "â€”" and mangles accents, arrows and maths symbols
    # throughout the report. Pin UTF-8 before iterating.
    response.encoding = "utf-8"

    for raw_line in response.iter_lines(decode_unicode=True):
        if not raw_line:
            continue
        line = raw_line.strip()
        if line.startswith("data:"):
            line = line[5:].strip()
        if not line or line == "[DONE]":
            continue
        try:
            chunk = json.loads(line)
        except json.JSONDecodeError:
            continue

        choices = chunk.get("choices") or []
        if not choices:
            continue
        finish_reason = choices[0].get("finish_reason") or finish_reason
        delta = choices[0].get("delta") or choices[0].get("message") or {}
        if delta.get("content"):
            content_parts.append(delta["content"])
        if delta.get("reasoning_content"):
            reasoning_parts.append(delta["reasoning_content"])

    return {
        "content": "".join(content_parts).strip(),
        "reasoning": "".join(reasoning_parts).strip(),
        "finish_reason": finish_reason,
    }


def _read_completion(response) -> Dict[str, Any]:
    """Pull the text out of a plain (non-streamed) chat completion."""
    try:
        choice = response.json()["choices"][0]
        message = choice["message"]
    except (ValueError, KeyError, IndexError):
        return {"content": "", "reasoning": "", "finish_reason": None}
    return {
        "content": (message.get("content") or "").strip(),
        "reasoning": (message.get("reasoning_content") or message.get("reasoning") or "").strip(),
        "finish_reason": choice.get("finish_reason"),
    }


def call_llm(
    prompt: str,
    system_prompt: str = "You are an expert deep research AI assistant.",
    temperature: float = 0.2,
    llm_config: Optional[Dict[str, Any]] = None,
    max_tokens: int = 4000
) -> str:
    """
    Calls llama-server (OpenAI compatible endpoint) or NVIDIA NIM Cloud API.

    Streams the completion, retries transient failures with backoff, and raises
    LLMError for cloud failures. The deterministic mock fallback applies only to
    the local provider — that is its documented purpose (running the UI without
    llama-server), not a way to paper over a broken cloud endpoint.
    """
    provider = "local"
    model = settings.MODEL_NAME
    api_key = None

    if llm_config:
        provider = llm_config.get("provider") or "local"
        model = llm_config.get("model") or settings.MODEL_NAME
        api_key = llm_config.get("api_key")

    is_cloud = provider == "nvidia"

    if _is_reasoning_model(model):
        max_tokens = min(max_tokens * REASONING_HEADROOM, MAX_TOKEN_CEILING)

    if is_cloud:
        # Fall back to the backend .env key if the client did not send one
        api_key = (api_key or settings.NVIDIA_API_KEY or "").strip()
        if not api_key:
            raise LLMError(
                "No NVIDIA API key. Add NVIDIA_API_KEY to backend/.env or paste a "
                "key into the Settings panel."
            )
        url = f"{settings.NVIDIA_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "Authorization": f"Bearer {api_key}"
        }
    else:
        url = f"{settings.LLAMA_SERVER_URL.rstrip('/')}/chat/completions"
        headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True
    }

    if not is_cloud:
        # llama-server's defaults (temperature 1.0, top_k 64) are tuned for open
        # chat and make a small model wander on long factual writing. These are
        # llama.cpp-specific sampler knobs, so they are sent only to the local
        # endpoint — NVIDIA rejects unknown fields with a 400.
        payload.update({
            "top_p": 0.9,
            "top_k": 40,
            "min_p": 0.05,
            # Long reports repeat section scaffolding without a mild penalty,
            # but anything stronger starts mangling technical terms and tables.
            "repeat_penalty": 1.08,
            "repeat_last_n": 256,
        })

    timeout = (settings.LLM_CONNECT_TIMEOUT, settings.LLM_READ_TIMEOUT)
    logger.info(f"Calling LLM: provider={provider}, model={model}, url={url}")

    last_error = None
    attempts = max(1, settings.LLM_MAX_ATTEMPTS)
    started = time.monotonic()

    for attempt in range(attempts):
        if time.monotonic() - started > settings.LLM_TOTAL_BUDGET:
            last_error = f"{last_error} (gave up after {settings.LLM_TOTAL_BUDGET:.0f}s)"
            break

        # Space out cloud calls — the free NIM tier rate-limits per minute.
        if is_cloud and settings.NVIDIA_THROTTLE_SECONDS > 0:
            time.sleep(settings.NVIDIA_THROTTLE_SECONDS)

        try:
            streaming = bool(payload.get("stream"))
            response = requests.post(url, headers=headers, json=payload, timeout=timeout, stream=streaming)

            if response.status_code == 200:
                result = _consume_stream(response) if streaming else _read_completion(response)
                content, reasoning = result["content"], result["reasoning"]
                truncated = result["finish_reason"] == "length"

                # Any reasoning channel at all marks this model as a reasoner, so
                # later calls get the token headroom up front.
                if reasoning and model not in _LEARNED_REASONING and model not in REASONING_MODELS:
                    _LEARNED_REASONING.add(model)
                    logger.info(f"'{model}' emits a reasoning channel; granting token headroom from now on")

                if content:
                    if truncated:
                        logger.warning(f"'{model}' hit the token cap; report may be cut short")
                    return content

                # No answer. A reasoning model that ran out of budget mid-thought
                # has only its monologue to offer — returning that would put the
                # model's internal chatter into the report, so grow the budget
                # and let it actually reach the answer instead.
                if truncated and reasoning and payload["max_tokens"] < MAX_TOKEN_CEILING:
                    payload["max_tokens"] = min(payload["max_tokens"] * 2, MAX_TOKEN_CEILING)
                    logger.warning(
                        f"'{model}' spent all {len(reasoning)} chars of its budget reasoning; "
                        f"retrying with max_tokens={payload['max_tokens']}"
                    )
                    continue

                # Finished cleanly with an empty content channel: some models put
                # the whole answer in `reasoning_content`. That one is genuine.
                if reasoning and not truncated:
                    return reasoning

                last_error = (
                    f"'{model}' returned no answer"
                    + (" (exhausted its token budget while reasoning)" if truncated else "")
                )
                logger.warning(f"{last_error} (attempt {attempt + 1}/{attempts})")

            else:
                body = (response.text or "")[:400].replace("\n", " ")
                last_error = f"HTTP {response.status_code}: {body}"
                logger.warning(f"LLM endpoint ({provider}) {last_error} (attempt {attempt + 1}/{attempts})")

                if response.status_code in (401, 403):
                    raise LLMError(
                        f"NVIDIA rejected the API key (HTTP {response.status_code}). "
                        "Check that the key is active and starts with 'nvapi-'."
                    )
                if response.status_code == 404:
                    raise LLMError(
                        f"Model '{model}' is listed in the NVIDIA catalogue but is not served "
                        "on this endpoint (HTTP 404). Most of that catalogue 404s on a free-tier "
                        "key — pick one of the verified models in Settings."
                    )

                # Some deployments cap completion length below what we asked
                # for. Back the budget off once rather than failing the run.
                if response.status_code == 400 and payload["max_tokens"] > 1024 and \
                        any(t in body.lower() for t in ("max_tokens", "max_new_tokens", "context", "too long")):
                    payload["max_tokens"] = max(1024, payload["max_tokens"] // 2)
                    logger.warning(f"Retrying '{model}' with max_tokens={payload['max_tokens']}")
                    continue

                # Some NIM deployments sit in a DEGRADED state where the
                # streaming path 400s but plain request/response still works
                # (z-ai/glm-5.2 does exactly this). Drop streaming and retry.
                if response.status_code == 400 and payload.get("stream"):
                    payload.pop("stream", None)
                    logger.warning(f"Streaming rejected by '{model}'; retrying without it")
                    continue

                if response.status_code not in RETRYABLE_STATUS:
                    break

                if attempt < attempts - 1:
                    time.sleep(_retry_after_seconds(response, 2 ** attempt))
                    continue

        except LLMError:
            raise
        except requests.exceptions.Timeout:
            last_error = (
                f"Timed out after {settings.LLM_READ_TIMEOUT}s waiting on '{model}'. "
                "The endpoint may be saturated — try a smaller model."
            )
            logger.warning(f"{last_error} (attempt {attempt + 1}/{attempts})")
        except Exception as e:
            last_error = f"{type(e).__name__}: {e}"
            logger.warning(f"Failed to reach LLM endpoint ({provider}): {last_error} (attempt {attempt + 1}/{attempts})")

        if attempt < attempts - 1:
            time.sleep(2 ** attempt)

    if is_cloud:
        raise LLMError(f"NVIDIA NIM call failed after {attempts} attempts — {last_error}")

    if settings.USE_MOCK_LLM_IF_UNAVAILABLE:
        logger.info("Local llama-server unreachable; using mock LLM response fallback")
        return _generate_mock_response(prompt, system_prompt)

    raise LLMError(f"Local LLM call failed: {last_error}")


def _generate_mock_response(prompt: str, system_prompt: str) -> str:
    """Provides detailed, customized fallback Markdown responses based on the topic."""
    prompt_lower = prompt.lower()
    
    # Try to extract the topic from the prompt
    topic = "Selected Target Topic"
    if 'topic: "' in prompt_lower:
        start_idx = prompt_lower.find('topic: "') + len('topic: "')
        end_idx = prompt_lower.find('"', start_idx)
        if start_idx != -1 and end_idx != -1:
            topic = prompt[start_idx:end_idx].strip()
    elif 'research topic: "' in prompt_lower:
        start_idx = prompt_lower.find('research topic: "') + len('research topic: "')
        end_idx = prompt_lower.find('"', start_idx)
        if start_idx != -1 and end_idx != -1:
            topic = prompt[start_idx:end_idx].strip()
            
    # Check for writer/report first
    if "writer" in prompt_lower or "report" in prompt_lower:
        title = topic.title()
        return f"""# Technical Report: Deep-Dive Analysis of {title}

## Executive Summary
This report compiles and synthesizes current technical evidence, research papers, and industrial documentation regarding **{topic}**. The goal of this analysis is to evaluate operational tradeoffs, core systems architectures, and practical implementation limits to outline a clear deployment roadmap.

## Key Findings & Core Themes
Based on verified empirical evaluations, several vital themes characterize the state of **{topic}**:

- **System Performance & Scalability**: Benchmarks indicate that targeted architectural adaptations yield a 40% improvement in resource consumption compared to legacy methods [Source 1 (Confidence: High)].
- **Implementation Tradeoffs**: Balancing low-latency execution with high fidelity remains the primary design constraint. Edge nodes require aggressive model quantization to maintain responsive bounds [Source 2 (Confidence: High)].
- **Operational Integration**: Orchestration pipelines benefit from state-persisted multi-agent systems, enhancing recovery limits and reducing query iterations [Source 3 (Confidence: Medium)].

## Technical Mechanisms & Architectural Details
The underlying framework of **{topic}** involves several key layers:

| Architectural Layer | Core Responsibility | Current Technical Metric |
| :--- | :--- | :--- |
| **Ingestion Engine** | Real-time stream filtering & preprocessing | 1.8ms processing delay |
| **Quantization Core** | Model compression & VRAM allocation | 4-bit / 5-bit GGUF formats |
| **Refinement Loop** | Iterative validation & consensus checks | 3 verification passes |

Recent deployments demonstrate that leveraging specialized local agents minimizes latency by routing non-critical tasks away from cloud endpoints, conserving valuable bandwidth and API call limits [Source 1 (Confidence: High)].

## Challenges, Tradeoffs & Future Outlook
While current systems demonstrate significant efficiency, several key hurdles remain:
1. **Context Management Limits**: High-token tasks still struggle with memory retention during long sessions, demanding advanced context compression algorithms.
2. **Hardware Constraints**: Running deep workloads locally is bound by GPU memory capacity. Developers must compromise on model size or run on sub-optimal offloading channels.
3. **Data Security**: Utilizing local pipelines provides excellent privacy features but restricts the agent's ability to fetch real-time external knowledge pools.

## Verified Sources & References
- **Source 1**: *Empirical Evaluation of Local Workloads and Optimization Models* (URL: https://arxiv.org/abs/search) [Overall Confidence: High]
- **Source 2**: *Architectural Design Patterns in Deep Workflows* (URL: https://en.wikipedia.org/wiki/deep_research) [Overall Confidence: High]
- **Source 3**: *Multi-Agent Consensus Pipelines and Query Control* (URL: https://html.duckduckgo.com/html/) [Overall Confidence: Medium]
"""
    elif "describe_image" in prompt_lower or "vision analysis" in prompt_lower:
        return "The image shows a system architecture diagram featuring an orchestrator node connected to multiple parallel worker nodes processing a unified research state."
    elif "critic" in prompt_lower or "evaluate" in prompt_lower or "sufficient" in prompt_lower:
        return json.dumps({
            "sufficient_coverage": False,
            "reasoning": "Initial search yielded foundational info, but specific performance metrics and recent breakthroughs require targeted follow-up.",
            "next_query": "key breakthroughs recent empirical results analysis"
        })
    elif "plan" in prompt_lower or "sub-question" in prompt_lower:
        return json.dumps({
            "sub_questions": [
                "What are the core technological foundations and principles?",
                "What are the most recent major breakthroughs and developments?",
                "What are the remaining technical challenges, limitations, and future outlook?"
            ],
            "initial_search_query": prompt.split("Topic:")[-1].strip().split("\n")[0] if "Topic:" in prompt else "deep research topic breakdown"
        })
    else:
        return "Synthesized analytical summary of key concepts based on retrieved search context."

import instructor
from openai import OpenAI
from pydantic import BaseModel
from typing import Type

def call_llm_json(
    prompt: str,
    response_model: Type[BaseModel],
    system_prompt: str = "You are an expert deep research AI assistant.",
    llm_config: Optional[Dict[str, Any]] = None,
    max_tokens: int = 4000
) -> BaseModel:
    """
    Calls the LLM enforcing a strict JSON schema using Instructor + Pydantic.
    """
    provider = "local"
    model = settings.MODEL_NAME
    api_key = None

    if llm_config:
        provider = llm_config.get("provider") or "local"
        model = llm_config.get("model") or settings.MODEL_NAME
        api_key = llm_config.get("api_key")

    is_cloud = provider == "nvidia"
    base_url = f"{settings.NVIDIA_BASE_URL.rstrip('/')}" if is_cloud else f"{settings.LLAMA_SERVER_URL.rstrip('/')}"
    api_key = api_key or settings.NVIDIA_API_KEY or "not-needed" if is_cloud else "sk-local"

    client = instructor.from_openai(
        OpenAI(base_url=base_url, api_key=api_key)
    )

    # Use JSON mode for instructor
    mode = instructor.Mode.JSON
    if is_cloud:
        mode = instructor.Mode.JSON_SCHEMA

    return client.chat.completions.create(
        model=model,
        response_model=response_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        max_tokens=max_tokens
    )

