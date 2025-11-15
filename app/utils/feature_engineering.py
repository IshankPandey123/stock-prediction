"""
Feature engineering utilities - All parameters are dynamic
No hardcoded window sizes, columns, or feature names
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Dynamic feature engineering"""
    
    def __init__(self):
        self.data: Optional[pd.DataFrame] = None
        self.generated_features: List[str] = []
    
    def generate_rolling_features(
        self,
        data: pd.DataFrame,
        columns: List[str],
        windows: List[int],
        operations: List[str] = None
    ) -> pd.DataFrame:
        """
        Generate rolling features dynamically
        
        Args:
            data: DataFrame to add features to
            columns: List of column names to create features for (dynamic)
            windows: List of window sizes (dynamic)
            operations: List of operations ['mean', 'std'] (default)
        
        Returns:
            DataFrame with new features added
        """
        if operations is None:
            operations = ['mean', 'std']
        
        dataframe = data.copy()
        feature_names = []
        
        for col in columns:
            if col not in dataframe.columns:
                logger.warning(f"Column '{col}' not found, skipping")
                continue
            
            for window in windows:
                for operation in operations:
                    if operation == 'mean':
                        feature_name = f"{col}_rolling_mean_{window}"
                        dataframe[feature_name] = dataframe[col].rolling(window=window).mean()
                        feature_names.append(feature_name)
                    elif operation == 'std':
                        feature_name = f"{col}_rolling_std_{window}"
                        dataframe[feature_name] = dataframe[col].rolling(window=window).std()
                        feature_names.append(feature_name)
                    elif operation == 'min':
                        feature_name = f"{col}_rolling_min_{window}"
                        dataframe[feature_name] = dataframe[col].rolling(window=window).min()
                        feature_names.append(feature_name)
                    elif operation == 'max':
                        feature_name = f"{col}_rolling_max_{window}"
                        dataframe[feature_name] = dataframe[col].rolling(window=window).max()
                        feature_names.append(feature_name)
        
        # Drop rows with NaN values created by rolling windows
        initial_rows = len(dataframe)
        dataframe.dropna(inplace=True)
        dropped_rows = initial_rows - len(dataframe)
        
        if dropped_rows > 0:
            logger.info(f"Dropped {dropped_rows} rows with NaN values after feature engineering")
        
        self.data = dataframe
        self.generated_features = feature_names
        
        return dataframe
    
    def get_feature_info(self) -> Dict:
        """
        Get information about generated features
        """
        if self.data is None:
            return {
                "feature_count": 0,
                "feature_names": [],
                "data_shape": None
            }
        
        return {
            "feature_count": len(self.generated_features),
            "feature_names": self.generated_features,
            "data_shape": {
                "rows": len(self.data),
                "columns": len(self.data.columns)
            },
            "preview": self.data.head(5).to_dict('records') if len(self.data) > 0 else []
        }
    
    def get_rolling_feature_names(
        self,
        columns: List[str],
        windows: List[int],
        operations: List[str] = None
    ) -> List[str]:
        """
        Get list of feature names that would be generated
        Without actually generating them
        """
        if operations is None:
            operations = ['mean', 'std']
        
        feature_names = []
        for col in columns:
            for window in windows:
                for operation in operations:
                    feature_name = f"{col}_rolling_{operation}_{window}"
                    feature_names.append(feature_name)
        
        return feature_names

