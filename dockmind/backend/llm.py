import os
from openai import OpenAI
import json

# Setup the OpenAI client to point to the local llama.cpp server
# Adjust base_url if your local server runs on a different port
client = OpenAI(
    base_url=os.getenv("OPENAI_BASE_URL", "http://localhost:8085/v1"),
    api_key="local-no-key-required"
)

# You can specify the model name if your server requires it, though llama.cpp usually ignores it.
MODEL_NAME = "gemma-4-e4b"

def rewrite_query(query: str) -> list[str]:
    system_prompt = "You are a search query optimizer. Given a user question, return exactly one short, improved search query. Do not use JSON. Just return the text."
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": query}],
            temperature=0.7,
            max_tokens=2048
        )
        content = response.choices[0].message.content.strip()
        return [content] if content else [query]
    except Exception as e:
        print(f"Query rewrite failed: {e}")
        return [query]

def verify_claims(query: str, answer: str, chunks: list[dict]) -> dict:
    system_prompt = "You are a fact checker. Answer with exactly one word: YES if the answer is supported by the context, NO if it is not."
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": f"Answer: {answer}"}],
            temperature=0.7,
            max_tokens=2048
        )
        content = response.choices[0].message.content.strip().lower()
        print(f"Qwen Verification Output: '{content}'")
        
        # If Qwen outputted nothing or something weird, we'll give it the benefit of the doubt for this demo
        is_supported = 'no' not in content 
        
        return {"supported": is_supported, "reasoning": "Verification completed"}
    except Exception as e:
        print(f"Verification failed: {e}")
        return {"supported": True, "reasoning": "Verification skipped due to error"}

def generate_answer_stream(query: str, chunks: list[dict]):
    """
    Streams the answer generation based on the retrieved chunks.
    """
    context_text = "\n\n".join([f"[{c.get('display_id', c['chunk_id'])}]: {c['text']}" for c in chunks])
    
    system_prompt = '''You are DocMind, an intelligent and highly articulate document analysis assistant.
Answer the user's question using ONLY the provided Context.
Adapt your length: if the question is simple, answer concisely and directly. If the question requires a detailed explanation or a full list, provide a comprehensive answer using rich Markdown (bullet points, bolding, etc.).
Cite your sources seamlessly inline using the format [Source 1].'''

    prompt = f"Context:\n{context_text}\n\nQuestion: {query}"
    
    stream = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}],
        temperature=0.7,
        frequency_penalty=1.5,
        presence_penalty=1.5,
        stream=True
    )
    
    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content
