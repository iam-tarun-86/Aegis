"""Which NIM catalogue entries actually serve chat completions.

NVIDIA's public `/v1/models` listing needs no auth and returns everything in the
catalogue — including many models that answer **404 Not Found** the moment you
POST to `/v1/chat/completions`. Listing is not availability, so a model picker
built straight off that endpoint is mostly dead entries.

Measured 2026-07-28 against a free-tier key (40 RPM), one small completion per
model: of 81 chat-shaped entries, **33 responded and 48 did not** (46 of those
a flat 404).

This records availability and round-trip latency only — not output quality.
Re-measure with `/api/nvidia-models`'s companion probe if NVIDIA rotates the
catalogue; these sets are a convenience, and an unknown id is still allowed
through (it simply lands in the "unverified" group in the UI).
"""

# Responded with usable content. Latency is for a trivial prompt and mostly
# reflects how loaded the shared free-tier worker was at probe time.
VERIFIED_CHAT_MODELS = {
    # --- large, good candidates for the writer/critic ---
    "nvidia/nemotron-3-ultra-550b-a55b",
    "nvidia/nemotron-3-super-120b-a12b",
    "openai/gpt-oss-120b",
    "deepseek-ai/deepseek-v4-pro",
    "deepseek-ai/deepseek-v4-flash",
    "stepfun-ai/step-3.7-flash",
    # Streaming 400s on these ("DEGRADED function cannot be invoked"); the
    # client falls back to a plain request and they answer fine.
    "z-ai/glm-5.2",
    "google/diffusiongemma-26b-a4b-it",
    "minimaxai/minimax-m3",
    "mistralai/mistral-medium-3.5-128b",
    "mistralai/mistral-nemotron",
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.3-70b-instruct",          # works, but was the slowest at ~46s
    "nvidia/llama-3.3-nemotron-super-49b-v1",
    "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    "thinkingmachines/inkling",

    # --- small / fast, good for quick tests and the planner ---
    "meta/llama-3.1-8b-instruct",
    "meta/llama-3.2-3b-instruct",
    "google/gemma-4-31b-it",
    "nvidia/nemotron-3-nano-30b-a3b",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    "nvidia/nvidia-nemotron-nano-9b-v2",
    "nvidia/llama-3.1-nemotron-nano-8b-v1",
    "nvidia/nemotron-mini-4b-instruct",
    "openai/gpt-oss-20b",

    # --- vision-capable, still answer plain chat ---
    "meta/llama-3.2-11b-vision-instruct",
    "meta/llama-3.2-90b-vision-instruct",
    "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
    "nvidia/nemotron-nano-12b-v2-vl",

    # --- specialised; reachable but not general research models ---
    "nvidia/ising-calibration-1.5-31b",
    "poolside/laguna-xs-2.1",
    "nvidia/riva-translate-4b-instruct-v1.1",
    "nvidia/riva-translate-4b-instruct-v2",
}

# Emit a separate `reasoning_content` channel and burn completion budget on
# thinking before any answer appears. They need a generous max_tokens, and a
# non-streaming client will often time out waiting through the silence.
REASONING_MODELS = {
    "nvidia/nemotron-3-ultra-550b-a55b",
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3-nano-30b-a3b",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    "nvidia/nvidia-nemotron-nano-9b-v2",
    "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "stepfun-ai/step-3.7-flash",
    "thinkingmachines/inkling",
}

# Listed in the catalogue, but 404 on /v1/chat/completions with a free-tier key.
KNOWN_UNAVAILABLE = {
    "01-ai/yi-large",
    "adept/fuyu-8b",
    "ai21labs/jamba-1.5-large-instruct",
    "aisingapore/sea-lion-7b-instruct",
    "bigcode/starcoder2-15b",
    "databricks/dbrx-instruct",
    "deepseek-ai/deepseek-coder-6.7b-instruct",
    "google/codegemma-1.1-7b",
    "google/codegemma-7b",
    "google/deplot",
    "google/gemma-2b",
    "google/gemma-3-12b-it",
    "google/gemma-3-4b-it",
    "google/recurrentgemma-2b",
    "ibm/granite-3.0-3b-a800m-instruct",
    "ibm/granite-3.0-8b-instruct",
    "ibm/granite-34b-code-instruct",
    "ibm/granite-8b-code-instruct",
    "meta/codellama-70b",
    "meta/llama2-70b",
    "microsoft/kosmos-2",
    "microsoft/phi-3-vision-128k-instruct",
    "microsoft/phi-3.5-moe-instruct",
    "mistralai/codestral-22b-instruct-v0.1",
    "mistralai/mistral-7b-instruct-v0.3",
    "mistralai/mistral-large",
    "mistralai/mistral-large-2-instruct",
    "mistralai/mixtral-8x22b-v0.1",
    "moonshotai/kimi-k2.6",
    "nv-mistralai/mistral-nemo-12b-instruct",
    "nvidia/cosmos-reason2-8b",
    "nvidia/llama-3.1-nemotron-51b-instruct",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    "nvidia/llama3-chatqa-1.5-70b",
    "nvidia/mistral-nemo-minitron-8b-8k-instruct",
    "nvidia/nemotron-4-340b-instruct",
    "nvidia/nemotron-nano-3-30b-a3b",
    "nvidia/neva-22b",
    "nvidia/riva-translate-4b-instruct",
    "nvidia/vila",
    # Not 404s, but unusable: the 1b times out repeatedly, and llama-guard is a
    # safety classifier that rejects plain chat payloads.
    "meta/llama-3.2-1b-instruct",
    "meta/llama-guard-4-12b",
    "writer/palmyra-creative-122b",
    "writer/palmyra-fin-70b-32k",
    "writer/palmyra-med-70b",
    "writer/palmyra-med-70b-32k",
    "zyphra/zamba2-7b-instruct",
}

# Not chat endpoints at all — embeddings, rerankers, parsers, safety classifiers.
NON_CHAT_PATTERNS = (
    "embed", "nvclip", "rerank", "retriever", "parse", "reward",
    "nemoguard", "safety", "video-detector", "bge-m3", "arctic-embed",
)

# Sensible starting point: reachable, fast, and strong enough for the writer.
DEFAULT_MODEL = "meta/llama-3.1-70b-instruct"


def is_non_chat(model_id: str) -> bool:
    lowered = model_id.lower()
    return any(pattern in lowered for pattern in NON_CHAT_PATTERNS)


def classify(model_id: str) -> str:
    """-> 'verified' | 'unavailable' | 'non-chat' | 'unverified'."""
    if model_id in VERIFIED_CHAT_MODELS:
        return "verified"
    if model_id in KNOWN_UNAVAILABLE:
        return "unavailable"
    if is_non_chat(model_id):
        return "non-chat"
    return "unverified"
