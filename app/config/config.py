"""
Configuration system - All values are configurable via environment variables
No hardcoded values allowed
"""
from pydantic import BaseModel
from typing import List, Dict, Any
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class FeatureConfig(BaseModel):
    """Feature engineering configuration"""
    lag_features: List[str]
    window_sizes: List[int]
    default_window1: int
    default_window2: int


class ModelConfig(BaseModel):
    """Model training configuration"""
    default_train_split: float  # 0.8 = 80%
    auto_arima_params: Dict[str, Any]
    target_column: str
    max_p: int = 5
    max_d: int = 2
    max_q: int = 5


class DataConfig(BaseModel):
    """Data loading configuration"""
    required_columns: List[str]
    date_column: str
    numeric_columns: List[str]
    upload_dir: str
    data_dir: str


class VisualizationConfig(BaseModel):
    """Visualization configuration"""
    default_candlestick_limit: int = 50
    chart_colors: Dict[str, str]


class AppConfig(BaseModel):
    """Main application configuration"""
    features: FeatureConfig
    model: ModelConfig
    data: DataConfig
    visualization: VisualizationConfig


def get_config() -> AppConfig:
    """
    Load configuration from environment variables
    All values are dynamic - no hardcoded values
    """
    # Feature configuration
    lag_features_str = os.getenv("LAG_FEATURES", "High,Low,Volume,Turnover")
    lag_features = [f.strip() for f in lag_features_str.split(",")]
    
    window_sizes_str = os.getenv("WINDOW_SIZES", "3,7")
    window_sizes = [int(x.strip()) for x in window_sizes_str.split(",")]
    
    # Model configuration
    default_train_split = float(os.getenv("DEFAULT_TRAIN_SPLIT", "0.8"))
    target_column = os.getenv("TARGET_COLUMN", "VWAP")
    
    # Data configuration
    required_columns_str = os.getenv(
        "REQUIRED_COLUMNS", 
        "Date,Symbol,Series,Prev Close,Open,High,Low,Last,Close,VWAP,Volume,Turnover"
    )
    required_columns = [c.strip() for c in required_columns_str.split(",")]
    
    numeric_columns_str = os.getenv(
        "NUMERIC_COLUMNS",
        "Open,High,Low,Close,Volume,Turnover,VWAP,Prev Close,Last"
    )
    numeric_columns = [c.strip() for c in numeric_columns_str.split(",")]
    
    # Directory paths
    base_dir = Path(__file__).parent.parent.parent
    upload_dir = os.getenv("DATA_UPLOAD_DIR", str(base_dir / "data" / "uploads"))
    data_dir = os.getenv("DATA_DIR", str(base_dir / "data"))
    
    # Visualization config
    chart_colors = {
        "primary": os.getenv("CHART_COLOR_PRIMARY", "#137fec"),
        "success": os.getenv("CHART_COLOR_SUCCESS", "#16a34a"),
        "danger": os.getenv("CHART_COLOR_DANGER", "#ef4444"),
        "warning": os.getenv("CHART_COLOR_WARNING", "#f97316")
    }
    
    return AppConfig(
        features=FeatureConfig(
            lag_features=lag_features,
            window_sizes=window_sizes,
            default_window1=int(os.getenv("DEFAULT_WINDOW1", str(window_sizes[0] if window_sizes else 3))),
            default_window2=int(os.getenv("DEFAULT_WINDOW2", str(window_sizes[1] if len(window_sizes) > 1 else 7)))
        ),
        model=ModelConfig(
            default_train_split=default_train_split,
            auto_arima_params={
                "max_p": int(os.getenv("ARIMA_MAX_P", "5")),
                "max_d": int(os.getenv("ARIMA_MAX_D", "2")),
                "max_q": int(os.getenv("ARIMA_MAX_Q", "5")),
                "trace": os.getenv("ARIMA_TRACE", "true").lower() == "true"
            },
            target_column=target_column
        ),
        data=DataConfig(
            required_columns=required_columns,
            date_column=os.getenv("DATE_COLUMN", "Date"),
            numeric_columns=numeric_columns,
            upload_dir=upload_dir,
            data_dir=data_dir
        ),
        visualization=VisualizationConfig(
            default_candlestick_limit=int(os.getenv("CANDLESTICK_LIMIT", "50")),
            chart_colors=chart_colors
        )
    )
