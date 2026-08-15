import os
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

class Settings(BaseModel):
    LLAMA_SERVER_URL: str = os.getenv("LLAMA_SERVER_URL", "http://localhost:8085/v1")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "gemma-4-e4b-q4_k_m")
    USE_MOCK_LLM_IF_UNAVAILABLE: bool = os.getenv("USE_MOCK_LLM_IF_UNAVAILABLE", "true").lower() == "true"
    DEFAULT_MAX_ROUNDS: int = 3
    MAX_SCRAPED_PAGES_PER_ROUND: int = 3

    NVIDIA_API_KEY: Optional[str] = os.getenv("NVIDIA_API_KEY")
    NVIDIA_BASE_URL: str = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

    # Connect timeout is short; the read timeout applies *per streamed chunk*,
    # not to the whole generation, so long reports no longer trip it.
    LLM_CONNECT_TIMEOUT: float = float(os.getenv("LLM_CONNECT_TIMEOUT", "15"))
    LLM_READ_TIMEOUT: float = float(os.getenv("LLM_READ_TIMEOUT", "120"))
    LLM_MAX_ATTEMPTS: int = int(os.getenv("LLM_MAX_ATTEMPTS", "4"))
    # Hard ceiling across all retries for one call. Without it, a model that
    # hangs can burn attempts x read-timeout (~8 min) before giving up.
    LLM_TOTAL_BUDGET: float = float(os.getenv("LLM_TOTAL_BUDGET", "300"))
    # NVIDIA's free NIM endpoints rate-limit aggressively; space calls out.
    NVIDIA_THROTTLE_SECONDS: float = float(os.getenv("NVIDIA_THROTTLE_SECONDS", "1.8"))

settings = Settings()
