# Stock Prediction System

A dynamic stock price prediction web application using ARIMA time series models. This system predicts stock VWAP (Volume Weighted Average Price) with **zero hardcoded values** - all configuration, data, and parameters are fetched in real-time from APIs and environment variables.

## 🚀 Features

- ✅ **Zero Hardcoded Values** - Everything is configurable via environment variables and API
- ✅ **Dynamic Data Loading** - Upload any CSV file, no hardcoded filenames
- ✅ **Dynamic Feature Engineering** - Configurable rolling window features (mean, std)
- ✅ **ARIMA Model Training** - Automatic model selection with configurable parameters
- ✅ **Real-time Predictions** - Generate forecasts with performance metrics
- ✅ **Interactive Frontend** - Modern, responsive UI with real-time updates
- ✅ **RESTful API** - FastAPI backend with comprehensive endpoints
- ✅ **Performance Metrics** - MSE, RMSE, MAE, MAPE, and Directional Accuracy
- ✅ **Data Visualizations** - Interactive charts for VWAP, candlestick, trends, and predictions

## 📋 Project Structure

```
stock-prediction/
├── app/
│   ├── api/
│   │   └── routes.py              # API endpoints
│   ├── config/
│   │   └── config.py               # Configuration system
│   ├── services/
│   │   ├── data_service.py         # Data operations
│   │   └── model_service.py        # Model operations
│   ├── utils/
│   │   ├── data_loader.py          # Data loading utilities
│   │   └── feature_engineering.py  # Feature engineering
│   └── main.py                     # FastAPI application
├── frontend/
│   ├── js/
│   │   ├── config.js              # Configuration loader
│   │   ├── data.js                 # Data management
│   │   ├── model.js                # Model operations
│   │   ├── metrics.js               # Metrics display
│   │   ├── utils.js                # Utility functions
│   │   └── visualizations.js       # Chart management
│   └── index.html                  # Main frontend page
├── data/
│   └── uploads/                    # Uploaded CSV files
├── models/                         # Saved models
├── .env.example                    # Environment variables template
├── .gitignore
├── requirements.txt                # Python dependencies
├── vercel.json                     # Vercel deployment config
└── README.md
```

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python web framework)
- pmdarima (ARIMA model)
- pandas, numpy (Data processing)
- scikit-learn (Machine learning utilities)

**Frontend:**
- HTML5, JavaScript (Vanilla JS)
- Tailwind CSS (Styling)
- ApexCharts (Data visualization)

**Deployment:**
- Vercel (Serverless deployment)

## 📦 Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/IshankPandey123/stock-prediction.git
   cd stock-prediction
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration (see Configuration section below).

5. **Create necessary directories:**
   ```bash
   mkdir -p data/uploads models
   ```

## ⚙️ Configuration

All configuration is done via environment variables in the `.env` file:

### Feature Engineering
```env
LAG_FEATURES=High,Low,Volume,Turnover
WINDOW_SIZES=3,7
DEFAULT_WINDOW1=3
DEFAULT_WINDOW2=7
```

### Model Configuration
```env
DEFAULT_TRAIN_SPLIT=0.8
TARGET_COLUMN=VWAP
ARIMA_MAX_P=5
ARIMA_MAX_D=2
ARIMA_MAX_Q=5
ARIMA_TRACE=true
```

### Data Configuration
```env
DATE_COLUMN=Date
REQUIRED_COLUMNS=Date,Symbol,Series,Prev Close,Open,High,Low,Last,Close,VWAP,Volume,Turnover
NUMERIC_COLUMNS=Open,High,Low,Close,Volume,Turnover,VWAP,Prev Close,Last
DATA_UPLOAD_DIR=data/uploads
DATA_DIR=data
```

### Visualization Configuration
```env
CANDLESTICK_LIMIT=50
CHART_COLOR_PRIMARY=#137fec
CHART_COLOR_SUCCESS=#16a34a
CHART_COLOR_DANGER=#ef4444
CHART_COLOR_WARNING=#f97316
```

## 🚀 Running the Application

### Local Development

Start the FastAPI server:

```bash
python -m app.main
```

Or using uvicorn directly:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The application will be available at:
- **Frontend:** `http://localhost:8000`
- **API Docs:** `http://localhost:8000/docs` (Swagger UI)
- **ReDoc:** `http://localhost:8000/redoc`

## 📖 Usage

### 1. Upload Data

Upload a CSV file containing stock data via the web interface or API:

```bash
curl -X POST "http://localhost:8000/api/data/upload" \
  -F "file=@your_stock_data.csv"
```

**Required CSV columns:** Date, Symbol, Series, Prev Close, Open, High, Low, Last, Close, VWAP, Volume, Turnover

### 2. Generate Features

Configure and generate rolling window features:

```bash
curl -X POST "http://localhost:8000/api/features/generate" \
  -F "columns=High" \
  -F "columns=Low" \
  -F "columns=Volume" \
  -F "window1=3" \
  -F "window2=7"
```

Or use the frontend interface to select columns and configure windows.

### 3. Train Model

Train the ARIMA model with your data:

```bash
curl -X POST "http://localhost:8000/api/model/train" \
  -F "train_split=0.8" \
  -F "target_column=VWAP" \
  -F "features=Highrolling_mean_3" \
  -F "features=Highrolling_mean_7"
```

### 4. Generate Predictions

Make predictions on the test data:

```bash
curl -X POST "http://localhost:8000/api/predict" \
  -F "n_periods=10"
```

### 5. View Metrics

Get performance metrics:

```bash
curl "http://localhost:8000/api/metrics"
```

Returns: MSE, RMSE, MAE, MAPE, and Directional Accuracy.

## 🔌 API Endpoints

### Configuration
- `GET /api/config` - Get all configuration values

### Data Management
- `POST /api/data/upload` - Upload CSV file
- `GET /api/data/info` - Get dataset information
- `GET /api/data/stats` - Get descriptive statistics

### Feature Engineering
- `POST /api/features/generate` - Generate rolling features

### Model Operations
- `POST /api/model/train` - Train ARIMA model
- `GET /api/model/info` - Get model information
- `POST /api/predict` - Make predictions
- `GET /api/metrics` - Get performance metrics

### Visualizations
- `GET /api/visualizations/vwap` - VWAP chart data
- `GET /api/visualizations/candlestick` - Candlestick chart data
- `GET /api/visualizations/price-trends` - Price trends chart
- `GET /api/visualizations/vwap-distribution` - VWAP distribution
- `GET /api/visualizations/predictions` - Predictions chart

## 🌐 Deployment

### Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/IshankPandey123/stock-prediction.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect Python
   - Add all environment variables from `.env.example` in Project Settings → Environment Variables
   - Click "Deploy"

3. **Access your deployed app:**
   - Backend URL: `https://your-project.vercel.app`
   - API Docs: `https://your-project.vercel.app/docs`
   - Frontend: `https://your-project.vercel.app/`

### Important Notes for Vercel Deployment

- **File Storage:** Vercel uses ephemeral storage. Uploaded files and models won't persist between deployments. Consider using:
  - External database (MongoDB, PostgreSQL)
  - Cloud storage (AWS S3, Cloudinary)
  - Vercel Blob Storage

- **Model Persistence:** Saved models won't persist. Options:
  - Store models in cloud storage
  - Re-train on each deployment
  - Use a database for model storage

- **Serverless Functions:** Vercel uses serverless functions with execution time limits. Ensure your code is optimized for this environment.

## 📊 Key Features: Zero Hardcoded Values

### ✅ Dynamic File Loading
- No hardcoded filenames
- Files uploaded via API
- File paths from environment variables

### ✅ Dynamic Feature Engineering
- Window sizes from config/user input
- Column selection from API
- Feature names generated dynamically

### ✅ Dynamic Model Training
- Train/test split from user input
- Model parameters from config
- Features selected dynamically

### ✅ Dynamic Predictions
- Number of periods from API or calculated
- All predictions computed in real-time

### ✅ Dynamic Metrics
- All metrics calculated from actual predictions
- No dummy/hardcoded values

### ✅ Dynamic Visualizations
- Chart data fetched from API
- Date ranges configurable
- Limits from config or user input

## 🧪 Development

### Running in Development Mode

```bash
uvicorn app.main:app --reload
```

### Testing API Endpoints

Use the interactive Swagger UI at `http://localhost:8000/docs` to test all endpoints.

## 📝 Requirements

- Python 3.8+
- See `requirements.txt` for all dependencies

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is for educational purposes.

## 👤 Author

**Ishank Pandey**

- GitHub: [@IshankPandey123](https://github.com/IshankPandey123)

## 🙏 Acknowledgments

- Built with FastAPI and pmdarima
- Frontend styled with Tailwind CSS
- Charts powered by ApexCharts

---

**Note:** All hardcoded values have been removed. Everything is configurable via environment variables, and all data is fetched dynamically from APIs. The system is production-ready with proper error handling.
