from db import doc_collection, bm25_index, bm25_ids, get_chunk_by_id, cursor

def normalize_scores(scores: list[float]) -> list[float]:
    """Min-max normalization for scores."""
    if not scores:
        return []
    min_score = min(scores)
    max_score = max(scores)
    if max_score == min_score:
        return [1.0] * len(scores)
    return [(s - min_score) / (max_score - min_score) for s in scores]

def retrieve(query: str, top_k: int = 10, doc_ids: list[str] = None) -> list[dict]:
    """
    Parallel Retrieval (Dense + Sparse) followed by Reciprocal Rank Fusion.
    Returns the top candidates.
    """
    
    # --- 1. Dense Retrieval (ChromaDB) ---
    query_kwargs = {
        "query_texts": [query],
        "n_results": top_k
    }
    if doc_ids:
        query_kwargs["where"] = {"doc_id": {"$in": doc_ids}}
        
    dense_results = doc_collection.query(**query_kwargs)
    
    dense_candidates = {}
    if dense_results and dense_results['ids'] and dense_results['ids'][0]:
        # Chroma returns distance (smaller is better for cosine if distance, or sometimes similarity).
        # We need to map it to a score where higher is better.
        ids = dense_results['ids'][0]
        distances = dense_results['distances'][0]
        # Invert distances to get a similarity score
        similarities = [1.0 / (1.0 + d) for d in distances]
        norm_similarities = normalize_scores(similarities)
        
        for i, chunk_id in enumerate(ids):
            dense_candidates[chunk_id] = {
                "dense_score": norm_similarities[i],
                "dense_rank": i + 1
            }

    # --- 2. Sparse Retrieval (BM25) ---
    sparse_candidates = {}
    if bm25_index:
        tokenized_query = query.split(" ")
        bm25_scores = bm25_index.get_scores(tokenized_query)
        
        if doc_ids:
            valid_chunk_ids = set()
            cursor.execute(f"SELECT chunk_id FROM chunks WHERE doc_id IN ({','.join(['?']*len(doc_ids))})", doc_ids)
            for row in cursor.fetchall():
                valid_chunk_ids.add(row[0])
                
            for i, chunk_id in enumerate(bm25_ids):
                if chunk_id not in valid_chunk_ids:
                    bm25_scores[i] = 0.0
        
        # Get top-k indices, strictly ignoring those that were zeroed out by document filters
        top_indices = []
        for idx in sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True):
            if bm25_scores[idx] > 0 or not doc_ids:
                top_indices.append(idx)
            if len(top_indices) == top_k:
                break
        
        raw_sparse_scores = [bm25_scores[i] for i in top_indices]
        norm_sparse_scores = normalize_scores(raw_sparse_scores) if raw_sparse_scores else []
        
        for rank, (original_index, score) in enumerate(zip(top_indices, norm_sparse_scores)):
            chunk_id = bm25_ids[original_index]
            sparse_candidates[chunk_id] = {
                "sparse_score": score,
                "sparse_rank": rank + 1
            }

    # --- 3. Reciprocal Rank Fusion (RRF) ---
    k = 60 # RRF constant
    merged_scores = {}
    all_ids = set(dense_candidates.keys()).union(set(sparse_candidates.keys()))
    
    for chunk_id in all_ids:
        dense_rank = dense_candidates.get(chunk_id, {}).get("dense_rank", 1000)
        sparse_rank = sparse_candidates.get(chunk_id, {}).get("sparse_rank", 1000)
        
        rrf_score = (1.0 / (k + dense_rank)) + (1.0 / (k + sparse_rank))
        merged_scores[chunk_id] = rrf_score
        
    # Sort by RRF score descending
    sorted_candidates = sorted(merged_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Resolve the chunks from SQLite to pass to the next stage
    final_results = []
    for chunk_id, score in sorted_candidates[:top_k]:
        chunk_data = get_chunk_by_id(chunk_id)
        if chunk_data:
            chunk_data["rrf_score"] = score
            final_results.append(chunk_data)
            
    return final_results
