"""
FastAPI Main Application
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, Response
import logging
from pathlib import Path
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create FastAPI app
app = FastAPI(
    title="Stock Prediction API",
    description="Dynamic stock prediction API with no hardcoded values",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files FIRST (before API routes)
frontend_path = Path(__file__).parent.parent / "frontend"

# Custom middleware to add no-cache headers for JS files
class NoCacheStaticFiles(StaticFiles):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    async def __call__(self, scope, receive, send):
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Add no-cache headers for JavaScript files
                headers = dict(message.get("headers", []))
                if b"content-type" in headers:
                    content_type = headers[b"content-type"].decode()
                    if "javascript" in content_type or "application/javascript" in content_type:
                        headers[b"cache-control"] = b"no-cache, no-store, must-revalidate"
                        headers[b"pragma"] = b"no-cache"
                        headers[b"expires"] = b"0"
                message["headers"] = list(headers.items())
            await send(message)
        
        await super().__call__(scope, receive, send_wrapper)

if frontend_path.exists():
    app.mount("/static", NoCacheStaticFiles(directory=str(frontend_path)), name="static")

# Serve main HTML page at root - MUST be before API routes
@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main frontend application at root"""
    index_path = frontend_path / "index.html"
    if index_path.exists():
        with open(index_path, 'r') as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Stock Prediction API</h1><p>Frontend not found. <a href='/docs'>API Docs</a></p>", status_code=404)

@app.get("/app", response_class=HTMLResponse)
async def frontend_app():
    """Serve the main frontend application"""
    index_path = frontend_path / "index.html"
    if index_path.exists():
        with open(index_path, 'r') as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Frontend not found</h1>", status_code=404)

@app.get("/debug.html", response_class=HTMLResponse)
async def debug_page():
    """Debug page to test function loading"""
    debug_path = frontend_path / "debug.html"
    if debug_path.exists():
        with open(debug_path, 'r') as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Debug page not found</h1>", status_code=404)

# Include API routes AFTER frontend routes
app.include_router(router)

@app.get("/api")
async def api_info():
    """API information endpoint"""
    return {
        "message": "Stock Prediction API",
        "version": "1.0.0",
        "endpoints": {
            "config": "/api/config",
            "upload": "/api/data/upload",
            "data_info": "/api/data/info",
            "generate_features": "/api/features/generate",
            "train_model": "/api/model/train",
            "predict": "/api/predict",
            "metrics": "/api/metrics",
            "visualizations": "/api/visualizations/*"
        },
        "frontend": "/"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

