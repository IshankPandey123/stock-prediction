"""
Data loading utilities - No hardcoded file paths or values
"""
import pandas as pd
import numpy as np
from typing import Dict, Optional, List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class DataLoader:
    """Dynamic data loading and cleaning"""
    
    def __init__(self, date_column: str = "Date"):
        self.date_column = date_column
        self.data: Optional[pd.DataFrame] = None
    
    def load_csv(self, file_path: str) -> pd.DataFrame:
        """
        Load CSV file dynamically - no hardcoded filename
        """
        try:
            df = pd.read_csv(file_path)
            logger.info(f"Loaded data from {file_path}: {len(df)} rows, {len(df.columns)} columns")
            return df
        except Exception as e:
            logger.error(f"Error loading file {file_path}: {str(e)}")
            raise
    
    def prepare_data(self, df: pd.DataFrame, date_column: str = None) -> pd.DataFrame:
        """
        Prepare data: set date index, clean data
        No hardcoded column names
        """
        date_col = date_column or self.date_column
        
        if date_col not in df.columns:
            raise ValueError(f"Date column '{date_col}' not found in data")
        
        # Convert date column to datetime
        df[date_col] = pd.to_datetime(df[date_col])
        
        # Set date as index
        data = df.set_index(date_col)
        
        # Remove 'Trades' column if it exists and has NaN values
        if 'Trades' in data.columns:
            if data['Trades'].isna().sum() > 0:
                data = data.drop(columns=['Trades'], axis=1)
                logger.info("Dropped 'Trades' column due to NaN values")
        
        # Remove duplicates
        duplicates = data.duplicated().sum()
        if duplicates > 0:
            data = data.drop_duplicates()
            logger.info(f"Removed {duplicates} duplicate rows")
        
        self.data = data
        return data
    
    def get_dataset_info(self, df: Optional[pd.DataFrame] = None) -> Dict:
        """
        Get dataset information dynamically
        """
        data = df if df is not None else self.data
        
        if data is None:
            return {}
        
        numeric_cols = list(data.select_dtypes(include=[np.number]).columns)
        
        info = {
            "total_rows": len(data),
            "total_columns": len(data.columns),
            "columns": list(data.columns),
            "numeric_columns": numeric_cols,
            "date_range": {
                "start": str(data.index.min()) if hasattr(data.index, 'min') else None,
                "end": str(data.index.max()) if hasattr(data.index, 'max') else None
            },
            "missing_values": data.isna().sum().to_dict(),
            "dtypes": {col: str(dtype) for col, dtype in data.dtypes.items()}
        }
        
        return info
    
    def get_descriptive_stats(self, df: Optional[pd.DataFrame] = None) -> Dict:
        """
        Get descriptive statistics dynamically
        """
        data = df if df is not None else self.data
        
        if data is None:
            return {}
        
        numeric_data = data.select_dtypes(include=[np.number])
        return numeric_data.describe().to_dict()

