# Student Performance Dashboard

A modern, interactive dashboard for tracking and visualizing student performance data from Google Sheets.

## Features

- 📊 **Interactive Charts**: Beautiful line charts showing performance trends
- 🔍 **Real-time Search**: Search students by name or ID
- 📈 **Performance Analytics**: Average, highest, and lowest scores
- 🎨 **Modern UI**: Dark theme with responsive design
- 📱 **Mobile Friendly**: Works on all device sizes
- 🔄 **Real-time Updates**: Live data from Google Sheets

## Prerequisites

- Python 3.7 or higher
- Google Cloud Platform account
- Google Sheets with student data

## Setup Instructions

### 1. Clone or Download the Project

Make sure you have all the project files in your directory.

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Google Sheets API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Desktop application"
   - Download the JSON file
5. Rename the downloaded file to `credentials.json` and place it in the project directory

### 4. Prepare Your Google Sheets

1. Create a Google Sheet with your student data
2. Structure your data as follows:
   ```
   Student ID | Name | Week 1-Task 1 | Week 1-Task 2 | Week 2-Task 1 | ...
   S001       | John | 85            | 92            | 78            | ...
   S002       | Jane | 90            | 88            | 95            | ...
   ```
3. Make sure the first sheet is named "Students"
4. Copy the Spreadsheet ID from the URL (the long string between /d/ and /edit)

### 5. Update Configuration

Open `app.py` and replace the `SPREADSHEET_ID` with your actual Google Sheets ID:

```python
SPREADSHEET_ID = 'your-spreadsheet-id-here'
```

### 6. Run the Application

```bash
python app.py
```

The dashboard will be available at: http://localhost:5000

## Usage

1. **View All Students**: The sidebar shows all students from your Google Sheets
2. **Search Students**: Use the search bar to find specific students
3. **View Performance**: Click on any student to see their detailed performance dashboard
4. **Analyze Trends**: The charts show performance trends over time
5. **Check Statistics**: View average, highest, and lowest scores

## API Endpoints

- `GET /` - Main dashboard page
- `GET /api/health` - Health check
- `GET /api/students` - Get all students data
- `GET /api/student/<id>` - Get specific student performance
- `GET /api/stats` - Get overall statistics

## Troubleshooting

### Common Issues

1. **"credentials.json not found"**
   - Make sure you've downloaded and renamed your Google API credentials file
   - Ensure it's in the same directory as `app.py`

2. **"Google Sheets API error"**
   - Check that you've enabled the Google Sheets API in Google Cloud Console
   - Verify your spreadsheet ID is correct
   - Ensure your Google Sheet is accessible

3. **"No data found"**
   - Check that your Google Sheet has data in the "Students" sheet
   - Verify the data structure (ID, Name, then performance columns)
   - Make sure the first row contains headers

4. **Authentication Issues**
   - Delete the `token.json` file and restart the application
   - Re-authenticate with Google when prompted

### First Run

On first run, the application will:
1. Open a browser window for Google authentication
2. Ask you to log in to your Google account
3. Request permission to access your Google Sheets
4. Create a `token.json` file for future use

## Project Structure

```
student-performance-dashboard/
├── app.py                          # Main Flask application
├── credentials.json                # Google API credentials (you need to add this)
├── requirements.txt                # Python dependencies
├── README.md                       # This file
├── templates/
│   └── index.html                  # Main dashboard template
└── static/
    ├── style.css                   # Styling
    └── script.js                   # Frontend JavaScript
```

## Customization

### Styling
- Edit `static/style.css` to customize colors, fonts, and layout
- The dashboard uses CSS variables for easy theming

### Data Structure
- Modify the data processing in `app.py` if your Google Sheets has a different structure
- Update the chart rendering in `static/script.js` for different visualizations

### Features
- Add new API endpoints in `app.py`
- Extend the frontend functionality in `static/script.js`

## Security Notes

- Keep your `credentials.json` file secure and never commit it to version control
- The `token.json` file contains sensitive authentication data
- Consider using environment variables for production deployment

## Support

If you encounter any issues:
1. Check the console output for error messages
2. Verify your Google Sheets setup
3. Ensure all dependencies are installed correctly
4. Check that your Google Cloud project has the necessary APIs enabled

## License

This project is open source and available under the MIT License. 