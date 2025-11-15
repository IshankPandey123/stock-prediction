"""
Data service - Handles all data operations dynamically
"""
import pandas as pd
import numpy as np
from typing import Dict, Optional, List, Tuple
from pathlib import Path
import logging
from app.utils.data_loader import DataLoader
from app.utils.feature_engineering import FeatureEngineer
from app.config.config import get_config

logger = logging.getLogger(__name__)


class DataService:
    """Service for data operations"""
    
    def __init__(self):
        self.data_loader = DataLoader()
        self.feature_engineer = FeatureEngineer()
        self.config = get_config()
        self.current_data: Optional[pd.DataFrame] = None
        self.file_path: Optional[str] = None
    
    async def load_data(self, file_path: str) -> Dict:
        """
        Load data from file - dynamic file path
        """
        try:
            # Ensure upload directory exists
            upload_dir = Path(self.config.data.upload_dir)
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            # Load CSV
            df = self.data_loader.load_csv(file_path)
            
            # Prepare data
            data = self.data_loader.prepare_data(df, self.config.data.date_column)
            
            self.current_data = data
            self.file_path = file_path
            
            # Get dataset info
            info = self.data_loader.get_dataset_info(data)
            
            logger.info(f"Data loaded successfully: {info['total_rows']} rows")
            return info
            
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise
    
    def has_data(self) -> bool:
        """Check if data is loaded"""
        return self.current_data is not None
    
    def get_dataset_info(self) -> Dict:
        """Get current dataset information"""
        if not self.has_data():
            return {"error": "No data loaded"}
        
        return self.data_loader.get_dataset_info(self.current_data)
    
    def get_descriptive_stats(self) -> Dict:
        """Get descriptive statistics"""
        if not self.has_data():
            return {"error": "No data loaded"}
        
        return self.data_loader.get_descriptive_stats(self.current_data)
    
    async def generate_rolling_features(
        self,
        columns: List[str],
        windows: List[int],
        operations: List[str] = None
    ) -> Dict:
        """
        Generate rolling features dynamically
        """
        if not self.has_data():
            raise ValueError("No data loaded. Please upload data first.")
        
        # Generate features
        data_with_features = self.feature_engineer.generate_rolling_features(
            data=self.current_data,
            columns=columns,
            windows=windows,
            operations=operations
        )
        
        # Update current data
        self.current_data = data_with_features
        
        # Get feature info
        feature_info = self.feature_engineer.get_feature_info()
        
        return feature_info
    
    def split_data(
        self,
        split_ratio: float,
        method: str = "date_based"
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Split data dynamically - no hardcoded indices
        """
        if not self.has_data():
            raise ValueError("No data loaded")
        
        if method == "date_based" and isinstance(self.current_data.index, pd.DatetimeIndex):
            split_index = int(len(self.current_data) * split_ratio)
            split_date = self.current_data.index[split_index]
            training_data = self.current_data[self.current_data.index < split_date]
            testing_data = self.current_data[self.current_data.index >= split_date]
        else:
            # Index-based split
            split_index = int(len(self.current_data) * split_ratio)
            training_data = self.current_data.iloc[:split_index]
            testing_data = self.current_data.iloc[split_index:]
        
        logger.info(f"Data split: {len(training_data)} training, {len(testing_data)} testing")
        return training_data, testing_data
    
    def get_vwap_chart_data(self, limit: Optional[int] = None) -> Dict:
        """Get VWAP chart data dynamically"""
        if not self.has_data():
            return {"error": "No data loaded"}
        
        if 'VWAP' not in self.current_data.columns:
            return {"error": "VWAP column not found"}
        
        data = self.current_data[['VWAP']].copy()
        
        if limit:
            data = data.tail(limit)
        
        return {
            "dates": [str(idx) for idx in data.index],
            "values": data['VWAP'].tolist()
        }
    
    def get_candlestick_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get candlestick chart data dynamically"""
        if not self.has_data():
            return {"error": "No data loaded"}
        
        required_cols = ['Open', 'High', 'Low', 'Close']
        missing_cols = [col for col in required_cols if col not in self.current_data.columns]
        
        if missing_cols:
            return {"error": f"Missing columns: {missing_cols}"}
        
        data = self.current_data[required_cols].copy()
        
        # Apply date filters
        if start_date:
            data = data[data.index >= pd.to_datetime(start_date)]
        if end_date:
            data = data[data.index <= pd.to_datetime(end_date)]
        
        # Apply limit
        if limit:
            data = data.tail(limit)
        
        return {
            "dates": [str(idx) for idx in data.index],
            "open": data['Open'].tolist(),
            "high": data['High'].tolist(),
            "low": data['Low'].tolist(),
            "close": data['Close'].tolist()
        }
    
    def get_price_trends_data(self, limit: Optional[int] = None) -> Dict:
        """Get price trends data for OHLC chart"""
        if not self.has_data():
            return {"error": "No data loaded"}
        
        cols = ['Open', 'High', 'Low', 'Close']
        available_cols = [col for col in cols if col in self.current_data.columns]
        
        if not available_cols:
            return {"error": "No price columns found"}
        
        data = self.current_data[available_cols].copy()
        
        if limit:
            data = data.tail(limit)
        
        result = {
            "dates": [str(idx) for idx in data.index]
        }
        
        for col in available_cols:
            result[col.lower()] = data[col].tolist()
        
        return result
    
    def get_vwap_distribution_data(self) -> Dict:
        """Get VWAP distribution data for histogram"""
        if not self.has_data():
            return {"error": "No data loaded"}
        
        if 'VWAP' not in self.current_data.columns:
            return {"error": "VWAP column not found"}
        
        vwap_data = self.current_data['VWAP'].dropna()
        
        return {
            "values": vwap_data.tolist(),
            "mean": float(vwap_data.mean()),
            "std": float(vwap_data.std()),
            "min": float(vwap_data.min()),
            "max": float(vwap_data.max())
        }

