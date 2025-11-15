"""
Model service - Handles model training and management dynamically
"""
import pandas as pd
import numpy as np
from typing import Dict, Optional, List, Tuple
import logging
import pickle
from pathlib import Path
from pmdarima import auto_arima
from app.config.config import get_config

logger = logging.getLogger(__name__)


class ModelService:
    """Service for model operations"""
    
    def __init__(self):
        self.config = get_config()
        self.model: Optional[object] = None
        self.model_info: Dict = {}
        self.training_data: Optional[pd.DataFrame] = None
        self.testing_data: Optional[pd.DataFrame] = None
        self.predictions: Optional[pd.Series] = None
        self.actual_values: Optional[pd.Series] = None
    
    async def train_arima(
        self,
        training_data: pd.DataFrame,
        target_column: str,
        features: List[str],
        test_data: Optional[pd.DataFrame] = None
    ) -> Dict:
        """
        Train ARIMA model dynamically
        No hardcoded parameters
        """
        try:
            if target_column not in training_data.columns:
                raise ValueError(f"Target column '{target_column}' not found in data")
            
            # Prepare features
            missing_features = [f for f in features if f not in training_data.columns]
            if missing_features:
                raise ValueError(f"Features not found: {missing_features}")
            
            # Extract target and features
            y = training_data[target_column]
            X = training_data[features] if features else None
            
            logger.info(f"Training ARIMA model with {len(y)} samples, {len(features) if features else 0} features")
            
            # Get ARIMA parameters from config
            arima_params = self.config.model.auto_arima_params
            
            # Train model
            model = auto_arima(
                y=y,
                X=X,
                trace=arima_params.get("trace", True),
                max_p=arima_params.get("max_p", 5),
                max_d=arima_params.get("max_d", 2),
                max_q=arima_params.get("max_q", 5),
                seasonal=False,
                stepwise=True
            )
            
            self.model = model
            self.training_data = training_data
            self.testing_data = test_data
            
            # Extract model information
            order = model.order if hasattr(model, 'order') else (0, 0, 0)
            
            self.model_info = {
                "model_type": "ARIMA",
                "parameters": {
                    "p": order[0],
                    "d": order[1],
                    "q": order[2]
                },
                "aic": float(model.aic()) if hasattr(model, 'aic') else None,
                "training_rows": len(training_data),
                "testing_rows": len(test_data) if test_data is not None else 0,
                "features_used": features,
                "target_column": target_column,
                "model_summary": str(model.summary()) if hasattr(model, 'summary') else None
            }
            
            logger.info(f"Model trained successfully: ARIMA{order}, AIC: {self.model_info['aic']}")
            
            return self.model_info
            
        except Exception as e:
            logger.error(f"Error training model: {str(e)}")
            raise
    
    def has_trained_model(self) -> bool:
        """Check if model is trained"""
        return self.model is not None
    
    def get_model_info(self) -> Dict:
        """Get current model information"""
        if not self.has_trained_model():
            return {"error": "No model trained"}
        
        return self.model_info
    
    async def predict(
        self,
        n_periods: Optional[int] = None,
        X: Optional[pd.DataFrame] = None
    ) -> Dict:
        """
        Make predictions dynamically
        """
        if not self.has_trained_model():
            raise ValueError("No trained model available")
        
        # Determine number of periods
        if n_periods is None:
            if self.testing_data is not None:
                n_periods = len(self.testing_data)
            else:
                raise ValueError("n_periods must be specified if no test data available")
        
        # Get features for prediction
        if X is None and self.testing_data is not None:
            features = self.model_info.get("features_used", [])
            if features:
                X = self.testing_data[features]
        
        # Make predictions
        try:
            forecast = self.model.predict(n_periods=n_periods, X=X)
            
            # Convert forecast to numpy array and check for NaN
            if hasattr(forecast, 'values'):
                forecast_array = forecast.values
            else:
                forecast_array = np.array(forecast)
            
            # Log forecast statistics
            nan_count = np.isnan(forecast_array).sum() if len(forecast_array) > 0 else 0
            logger.info(f"Forecast generated: {len(forecast_array)} values, NaN count: {nan_count}")
            
            # Get dates
            if self.testing_data is not None:
                dates = [str(idx) for idx in self.testing_data.index[:n_periods]]
                actual = self.testing_data[self.model_info["target_column"]].iloc[:n_periods].tolist()
                
                # Check for NaN in actual values
                actual_nan_count = sum(1 for v in actual if (isinstance(v, (int, float)) and pd.isna(v)) or (not isinstance(v, (int, float)) and v is None))
                logger.info(f"Actual values: {len(actual)} values, NaN count: {actual_nan_count}")
            else:
                # Generate future dates
                last_date = self.training_data.index[-1]
                dates = [str(pd.date_range(start=last_date, periods=n_periods+1, freq='D')[1:][i]) 
                        for i in range(n_periods)]
                actual = None
            
            self.predictions = pd.Series(forecast_array, index=dates if dates else range(n_periods))
            if actual:
                self.actual_values = pd.Series(actual, index=dates)
            
            return {
                "values": forecast.tolist() if hasattr(forecast, 'tolist') else list(forecast),
                "dates": dates,
                "actual": actual,
                "n_periods": n_periods
            }
            
        except Exception as e:
            logger.error(f"Error making predictions: {str(e)}")
            raise
    
    def calculate_metrics(self) -> Dict:
        """
        Calculate performance metrics dynamically
        """
        if self.predictions is None or self.actual_values is None:
            raise ValueError("Predictions and actual values required for metrics")
        
        from sklearn.metrics import mean_absolute_error, mean_squared_error
        
        # Extract values first, handling different types
        try:
            if isinstance(self.predictions, pd.Series):
                pred_values = self.predictions.values
            else:
                pred_values = np.array(self.predictions)
            
            if isinstance(self.actual_values, pd.Series):
                actual_values = self.actual_values.values
            else:
                actual_values = np.array(self.actual_values)
        except Exception as e:
            logger.error(f"Error extracting values: {str(e)}")
            raise ValueError(f"Error extracting values: {str(e)}")
        
        # Ensure same length (positional alignment)
        min_len = min(len(pred_values), len(actual_values))
        pred_values = pred_values[:min_len]
        actual_values = actual_values[:min_len]
        
        if min_len == 0:
            raise ValueError("No predictions and actual values available for metrics")
        
        # Convert to float64, handling any conversion errors
        try:
            pred_values = np.asarray(pred_values, dtype=np.float64)
            actual_values = np.asarray(actual_values, dtype=np.float64)
        except (ValueError, TypeError) as e:
            logger.error(f"Error converting to numeric: {str(e)}")
            raise ValueError(f"Error converting to numeric: {str(e)}")
        
        # Remove NaN and inf values from both arrays
        valid_mask = np.isfinite(pred_values) & np.isfinite(actual_values)
        
        # Log diagnostic information
        nan_pred_count = np.isnan(pred_values).sum() if len(pred_values) > 0 else 0
        nan_actual_count = np.isnan(actual_values).sum() if len(actual_values) > 0 else 0
        inf_pred_count = np.isinf(pred_values).sum() if len(pred_values) > 0 else 0
        inf_actual_count = np.isinf(actual_values).sum() if len(actual_values) > 0 else 0
        valid_count = np.sum(valid_mask) if len(valid_mask) > 0 else 0
        
        logger.info(f"Metrics calculation - Total: {len(pred_values)}, Valid: {valid_count}, "
                   f"NaN (pred/actual): {nan_pred_count}/{nan_actual_count}, "
                   f"Inf (pred/actual): {inf_pred_count}/{inf_actual_count}")
        
        if not np.any(valid_mask):
            error_msg = (f"No valid (finite) predictions and actual values available. "
                        f"Total values: {len(pred_values)}, "
                        f"NaN in predictions: {nan_pred_count}, "
                        f"NaN in actual: {nan_actual_count}, "
                        f"Inf in predictions: {inf_pred_count}, "
                        f"Inf in actual: {inf_actual_count}")
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        pred_clean = pred_values[valid_mask]
        actual_clean = actual_values[valid_mask]
        
        if len(pred_clean) == 0:
            raise ValueError("No valid predictions and actual values after filtering NaN/inf")
        
        # Final check: ensure no NaN/inf remain
        if np.any(~np.isfinite(pred_clean)) or np.any(~np.isfinite(actual_clean)):
            logger.error("NaN/inf values still present after filtering")
            raise ValueError("NaN/inf values still present after filtering")
        
        # Calculate metrics
        try:
            mse = mean_squared_error(actual_clean, pred_clean)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(actual_clean, pred_clean)
        except Exception as e:
            logger.error(f"Error calculating metrics: {str(e)}")
            raise ValueError(f"Error calculating metrics: {str(e)}")
        
        # Calculate MAPE (handle division by zero)
        non_zero_mask = np.abs(actual_clean) > 1e-10
        if np.any(non_zero_mask):
            mape = np.mean(np.abs((actual_clean[non_zero_mask] - pred_clean[non_zero_mask]) / actual_clean[non_zero_mask])) * 100
        else:
            mape = None  # All actual values are zero, MAPE is undefined
        
        # Calculate directional accuracy
        if len(actual_clean) > 1:
            actual_direction = np.diff(actual_clean) > 0
            pred_direction = np.diff(pred_clean) > 0
            directional_accuracy = np.mean(actual_direction == pred_direction) * 100
        else:
            directional_accuracy = None
        
        metrics = {
            "mse": float(mse),
            "rmse": float(rmse),
            "mae": float(mae),
            "mape": float(mape) if mape is not None else None,
            "directional_accuracy": float(directional_accuracy) if directional_accuracy is not None else None
        }
        
        logger.info(f"Metrics calculated successfully: MSE={mse:.4f}, RMSE={rmse:.4f}, MAE={mae:.4f}")
        
        return metrics
    
    def get_predictions_chart_data(self) -> Dict:
        """Get data for predictions chart"""
        if self.predictions is None:
            return {"error": "No predictions available"}
        
        result = {
            "dates": [str(idx) for idx in self.predictions.index],
            "predicted": self.predictions.tolist()
        }
        
        if self.actual_values is not None:
            result["actual"] = self.actual_values.tolist()
        
        return result
    
    def save_model(self, file_path: str) -> bool:
        """Save trained model to file"""
        try:
            if not self.has_trained_model():
                return False
            
            model_dir = Path(file_path).parent
            model_dir.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'wb') as f:
                pickle.dump({
                    'model': self.model,
                    'model_info': self.model_info,
                    'training_data': self.training_data,
                    'testing_data': self.testing_data
                }, f)
            
            logger.info(f"Model saved to {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
            return False
    
    def load_model(self, file_path: str) -> bool:
        """Load model from file"""
        try:
            with open(file_path, 'rb') as f:
                data = pickle.load(f)
                self.model = data['model']
                self.model_info = data['model_info']
                self.training_data = data.get('training_data')
                self.testing_data = data.get('testing_data')
            
            logger.info(f"Model loaded from {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            return False
    
    def has_predictions(self) -> bool:
        """Check if predictions are available"""
        return self.predictions is not None

