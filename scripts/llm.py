"""
LLM Request Utility Module

Provides unified LLM request handling via Groq API.
Centralizes API key management and response parsing.

USAGE:
    from libs.llm import llm_request

    response = llm_request([
        {'role': 'system', 'content': 'You are a helpful assistant.'},
        {'role': 'user', 'content': 'Hello!'}
    ])

API:
    llm_request(messages, model, max_tokens, temperature) -> str
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
LOCAL_API_URL = 'http://localhost:11435/generate'
DEFAULT_MODEL = 'llama-3.3-70b-versatile'
DEFAULT_LOCAL_MODEL = 'qwen3-4b-instruct'


def llm_request(messages, model=None, max_tokens=500, temperature=0.7, provider='groq', fallback=True, adapter='chat'):
    """
    Make request to LLM API (Groq or local) with automatic fallback.

    Args:
        messages: List of message dicts with 'role' and 'content' keys
        model: Model name (default: llama-3.3-70b-versatile for Groq, qwen3-4b-instruct for local)
        max_tokens: Maximum tokens in response (default: 500)
        temperature: Sampling temperature (default: 0.7)
        provider: LLM provider ('groq' or 'local', default: 'groq')
        fallback: If True, automatically fall back to local on Groq failure (default: True)
        adapter: LoRA adapter name for local model (default: 'chat')
                Options: summarization, compression, image_prompt, chat, card_creator, possession_query

    Returns:
        str: Response content from LLM

    Raises:
        ValueError: If GROQ_API_KEY not configured (for Groq provider)
        Exception: If both providers fail (when fallback enabled)
    """
    if provider == 'local':
        return _local_llm_request(messages, model, max_tokens, temperature, adapter)
    else:
        # Try Groq first
        try:
            return _groq_llm_request(messages, model, max_tokens, temperature)
        except Exception as e:
            # If fallback enabled, try local LLM
            if fallback:
                print(f"Groq API failed ({str(e)}), falling back to local LLM...")
                return _local_llm_request(messages, model, max_tokens, temperature, adapter)
            else:
                raise


def _groq_llm_request(messages, model=None, max_tokens=500, temperature=0.7):
    """Make request to Groq LLM API."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found in environment")

    response = requests.post(
        GROQ_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": model or DEFAULT_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        },
        timeout=60
    )

    if response.status_code != 200:
        raise Exception(f'Groq API error: {response.status_code} - {response.text}')

    result = response.json()
    content = result["choices"][0]["message"]["content"].strip()

    # Strip markdown code fences if present
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]

    return content.strip()


def _local_llm_request(messages, model=None, max_tokens=500, temperature=0.7, adapter='chat'):
    """Make request to local LLM service."""
    response = requests.post(
        LOCAL_API_URL,
        headers={"Content-Type": "application/json"},
        json={
            "messages": messages,
            "adapter": adapter
        },
        timeout=120,
        stream=True
    )

    if response.status_code != 200:
        raise Exception(f'Local LLM error: {response.status_code} - {response.text}')

    # Collect streaming response
    content = ""
    for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
        if chunk:
            content += chunk

    # Strip markdown code fences if present
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]

    return content.strip()
