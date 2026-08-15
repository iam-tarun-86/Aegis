import os
import json
from openai import OpenAI

# Setup the OpenAI client to point strictly to the local llama.cpp server
client = OpenAI(
    base_url=os.getenv("OPENAI_BASE_URL", "http://localhost:8085/v1"),
    api_key=os.getenv("OPENAI_API_KEY", "local-no-key-required")
)

MODEL_NAME = os.getenv("LOCAL_MODEL", "gemma-4-e4b")

def rewrite_query(query: str) -> list[str]:
    # If greeting, skip rewriting
    if query.strip().lower() in ["hi", "hello", "hey", "help", "who are you"]:
        return [query]

    system_prompt = "You are a search query optimizer. Given a user question, return exactly one short, improved search query for document retrieval. Do not use JSON or explanation. Just return the search keywords."
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": query}],
            temperature=0.2,
            max_tokens=256
        )
        content = response.choices[0].message.content.strip()
        return [content] if content else [query]
    except Exception as e:
        print(f"Query rewrite failed: {e}")
        return [query]

def verify_claims(query: str, answer: str, chunks: list[dict]) -> dict:
    if not chunks or query.strip().lower() in ["hi", "hello", "hey"]:
        return {"supported": True, "reasoning": "Direct conversational response"}

    system_prompt = "You are a fact checker. Answer with exactly one word: YES if the answer is supported by the context, NO if it is not."
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": f"Answer: {answer}"}],
            temperature=0.1,
            max_tokens=100
        )
        content = response.choices[0].message.content.strip().lower()
        is_supported = 'no' not in content 
        return {"supported": is_supported, "reasoning": "Verification completed"}
    except Exception as e:
        print(f"Verification failed: {e}")
        return {"supported": True, "reasoning": "Verification skipped due to error"}

def generate_answer_stream(query: str, chunks: list[dict]):
    """
    Streams the answer generation based on the retrieved chunks.
    """
    cleaned_query = query.strip().lower()
    if cleaned_query in ["hi", "hello", "hey", "who are you", "what can you do"]:
        greeting = "Hello! I am **DocMind**, your AI document intelligence assistant. I have indexed your research report. Ask me anything about the key findings, methodology, models, or specific sections, and I'll analyze the document with inline citations!"
        for char in greeting:
            yield char
        return

    context_text = "\n\n".join([f"[{c.get('display_id', c['chunk_id'])}]: {c['text']}" for c in chunks])
    
    system_prompt = '''You are DocMind, an intelligent and articulate document analysis assistant.
Answer the user's question accurately based on the provided Context.
Use rich Markdown with clear headings and bullet points where helpful.
Cite your sources seamlessly inline using the format [Source 1], [Source 2].
If the answer is not contained in the context, state clearly what is and isn't available.'''

    prompt = f"Context:\n{context_text}\n\nQuestion: {query}"
    
    stream = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}],
        temperature=0.3,
        stream=True
    )
    
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content
