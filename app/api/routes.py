"""
API Routes - All endpoints return dynamic data
No hardcoded values
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
import logging
from pathlib import Path
import shutil

from app.services.data_service import DataService
from app.services.model_service import ModelService
from app.config.config import get_config

logger = logging.getLogger(__name__)

router = APIRouter()
config = get_config()

# Initialize services
data_service = DataService()
model_service = ModelService()


@router.get("/api/config")
async def get_configuration():
    """Returns all configuration values dynamically"""
    return {
        "features": {
            "lag_features": config.features.lag_features,
            "window_sizes": config.features.window_sizes,
            "default_window1": config.features.default_window1,
            "default_window2": config.features.default_window2
        },
        "model": {
            "default_train_split": config.model.default_train_split,
            "target_column": config.model.target_column,
            "auto_arima_params": config.model.auto_arima_params
        },
        "data": {
            "required_columns": config.data.required_columns,
            "date_column": config.data.date_column,
            "numeric_columns": config.data.numeric_columns
        },
        "visualization": {
            "default_candlestick_limit": config.visualization.default_candlestick_limit,
            "chart_colors": config.visualization.chart_colors
        }
    }


@router.post("/api/data/upload")
async def upload_data(file: UploadFile = File(...)):
    """Upload CSV file - no hardcoded filename"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    
    try:
        # Save file dynamically
        upload_dir = Path(config.data.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Load and process data
        dataset_info = await data_service.load_data(str(file_path))
        
        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "dataset_info": dataset_info
        }
        
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.get("/api/data/info")
async def get_data_info():
    """Get current dataset information - fetched from actual data"""
    if not data_service.has_data():
        return JSONResponse(
            status_code=404,
            content={"error": "No data loaded. Please upload a CSV file first."}
        )
    
    info = data_service.get_dataset_info()
    return info


@router.get("/api/data/stats")
async def get_data_stats():
    """Get descriptive statistics"""
    if not data_service.has_data():
        raise HTTPException(status_code=404, detail="No data loaded")
    
    stats = data_service.get_descriptive_stats()
    return stats


@router.post("/api/features/generate")
async def generate_features(
    columns: List[str] = Form(...),
    window1: int = Form(...),
    window2: int = Form(...)
):
    """Generate features dynamically based on user input"""
    if not data_service.has_data():
        raise HTTPException(status_code=400, detail="No data loaded. Please upload data first.")
    
    try:
        windows = [window1, window2]
        features = await data_service.generate_rolling_features(
            columns=columns,
            windows=windows
        )
        
        return features
        
    except Exception as e:
        logger.error(f"Error generating features: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/model/train")
async def train_model(
    train_split: float = Form(...),
    target_column: str = Form(...),
    features: Optional[List[str]] = Form(None)
):
    """Train model with dynamic parameters"""
    if not data_service.has_data():
        raise HTTPException(status_code=400, detail="No data loaded")
    
    try:
        # Split data dynamically
        training_data, testing_data = data_service.split_data(
            split_ratio=train_split,
            method="date_based"
        )
        
        # Use provided features or get from config
        if features is None or len(features) == 0:
            # Get generated features
            if hasattr(data_service.feature_engineer, 'generated_features'):
                features = data_service.feature_engineer.generated_features
            else:
                raise HTTPException(
                    status_code=400,
                    detail="No features available. Please generate features first."
                )
        
        # Train model
        model_info = await model_service.train_arima(
            training_data=training_data,
            target_column=target_column,
            features=features,
            test_data=testing_data
        )
        
        return model_info
        
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/model/info")
async def get_model_info():
    """Get model information"""
    if not model_service.has_trained_model():
        return JSONResponse(
            status_code=404,
            content={"error": "No model trained. Please train a model first."}
        )
    
    return model_service.get_model_info()


@router.post("/api/predict")
async def make_predictions(
    n_periods: Optional[int] = Form(None)
):
    """Make predictions - no hardcoded periods"""
    if not model_service.has_trained_model():
        raise HTTPException(status_code=400, detail="No trained model available")
    
    try:
        predictions = await model_service.predict(n_periods=n_periods)
        return predictions
        
    except Exception as e:
        logger.error(f"Error making predictions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/metrics")
async def get_metrics():
    """Calculate metrics from actual predictions - no hardcoded values"""
    if not model_service.has_predictions():
        raise HTTPException(
            status_code=400,
            detail="No predictions available. Please make predictions first."
        )
    
    try:
        # Check if we have both predictions and actual values
        if model_service.predictions is None or model_service.actual_values is None:
            raise HTTPException(
                status_code=400,
                detail="Actual values are required for metrics calculation. Please make predictions on test data first."
            )
        
        metrics = model_service.calculate_metrics()
        return metrics
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except ValueError as e:
        # ValueError indicates data quality issues, return 400
        logger.error(f"Data quality issue in metrics calculation: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error calculating metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/visualizations/vwap")
async def get_vwap_chart(limit: Optional[int] = None):
    """Get VWAP chart data - from actual data"""
    if not data_service.has_data():
        raise HTTPException(status_code=404, detail="No data loaded")
    
    chart_data = data_service.get_vwap_chart_data(limit=limit)
    return chart_data


@router.get("/api/visualizations/candlestick")
async def get_candlestick_chart(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = None
):
    """Get candlestick data - dynamic date range"""
    if not data_service.has_data():
        raise HTTPException(status_code=404, detail="No data loaded")
    
    if limit is None:
        limit = config.visualization.default_candlestick_limit
    
    chart_data = data_service.get_candlestick_data(
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )
    return chart_data


@router.get("/api/visualizations/price-trends")
async def get_price_trends_chart(limit: Optional[int] = None):
    """Get price trends data"""
    if not data_service.has_data():
        raise HTTPException(status_code=404, detail="No data loaded")
    
    chart_data = data_service.get_price_trends_data(limit=limit)
    return chart_data


@router.get("/api/visualizations/vwap-distribution")
async def get_vwap_distribution():
    """Get VWAP distribution data"""
    if not data_service.has_data():
        raise HTTPException(status_code=404, detail="No data loaded")
    
    distribution_data = data_service.get_vwap_distribution_data()
    return distribution_data


@router.get("/api/visualizations/predictions")
async def get_predictions_chart():
    """Get actual vs predicted chart - from real predictions"""
    if not model_service.has_predictions():
        raise HTTPException(status_code=404, detail="No predictions available")
    
    chart_data = model_service.get_predictions_chart_data()
    return chart_data

