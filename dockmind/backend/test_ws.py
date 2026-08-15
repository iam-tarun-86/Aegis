import asyncio
import websockets
import json

async def test_chat():
    uri = "ws://localhost:8000/chat"
    try:
        async with websockets.connect(uri) as ws:
            print("Connected to WebSocket.")
            query = "What happens if the containment field fails?"
            print(f"Sending query: {query}")
            await ws.send(json.dumps({"query": query}))
            
            print("Response stream:")
            while True:
                response = await ws.recv()
                data = json.loads(response)
                
                if data["type"] == "sources":
                    print(f"\n[SOURCES RETRIEVED]: {len(data['data'])} chunks")
                elif data["type"] == "token":
                    print(data["data"], end="", flush=True)
                elif data["type"] == "status":
                    print(f"\n[STATUS]: {data['data']}")
                elif data["type"] == "done":
                    print(f"\n[DONE] Confidence Score: {data['confidence']} - {data['flag']}")
                    if data.get('verification_reasoning'):
                        print(f"Reasoning: {data['verification_reasoning']}")
                    break
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_chat())
