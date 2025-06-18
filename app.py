import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_cors import CORS
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import json
import random
import math
from datetime import datetime, timedelta
from google.oauth2 import service_account
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///students.db' # SQLite database file
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Disable Flask-SQLAlchemy event system
db = SQLAlchemy(app)

# Google Sheets API configuration
SPREADSHEET_ID = '1asFR89OBzgP4CpfLfgbwq9HMhuzqhzhbSiV--rZBnYc'
SHEET_NAME = "Student Performance" # Corrected sheet name
# GOOGLE_API_KEY = 'AIzaSyAaYseBBgOigjMsJLAc9MdDAcagyvHDh2o' # No longer needed for service account
# Construct the absolute path to the credentials file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_FILE = os.path.join(BASE_DIR, 'webprogress-462805-72873545fdbb.json')
print(f"Attempting to load service account file from: {SERVICE_ACCOUNT_FILE}")
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'] # Read-only access
DEMO_MODE = False  # Set to True to use dummy data (if you re-enable it), False to use Google Sheets

# Define the Student model for the database
class Student(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    average_score = db.Column(db.Float, nullable=False)
    highest_score = db.Column(db.Float, nullable=False)
    lowest_score = db.Column(db.Float, nullable=False)
    total_tasks = db.Column(db.Integer, nullable=False)
    performance_level = db.Column(db.String(50), nullable=False)
    trend = db.Column(db.String(50), nullable=False)
    completion_rate = db.Column(db.Float, nullable=False)
    current_status = db.Column(db.String(100), nullable=True) # New column for current status
    # Store performance as JSON string
    performance_json = db.Column(db.String, nullable=False)

    def __repr__(self):
        return f'<Student {self.name}>'

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "performance": json.loads(self.performance_json),
            "metrics": {
                "average_score": self.average_score,
                "highest_score": self.highest_score,
                "lowest_score": self.lowest_score,
                "total_tasks": self.total_tasks,
                "performance_level": self.performance_level,
                "trend": self.trend,
                "completion_rate": self.completion_rate
            },
            "current_status": self.current_status # Include current_status in the dictionary
        }

# No longer a global variable, data will be fetched from DB
# STUDENT_DATA = [] 
TASKS = [] # This will be populated dynamically from the sheet header

def get_sheets_service():
    """Get Google Sheets service using a service account."""
    creds = None
    try:
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        service = build('sheets', 'v4', credentials=creds)
        return service
    except Exception as e:
        print(f"Error setting up Google Sheets service: {e}")
        raise

def fetch_and_process_sheet_data_from_sheet():
    """Fetches data from Google Sheet and processes it into student performance data."""
    global TASKS
    students_data = []
    service = get_sheets_service()
    range_name = f'{SHEET_NAME}!A:Q' # Assuming data is in columns A to Q

    try:
        result = service.spreadsheets().values().get(
            spreadsheetId=SPREADSHEET_ID,
            range=range_name
        ).execute()
        values = result.get('values', [])

        if not values or len(values) < 2: # Ensure at least two rows for headers + some data
            print("No data or insufficient header rows found in Google Sheet.")
            return []

        header_row1 = values[0]
        header_row2 = values[1]
        
        # Define fixed column indices based on the provided sheet structure
        user_id_col = 0 # Column A
        name_col = 1    # Column B
        current_status_col = 10 # Assuming 'Current Status' is in Column K (index 10)
        
        # Map task names to their fixed column indices (from first header row)
        task_indices_map = {
            "Spreadsheet": 4, # Column E
            "SQL": 5,         # Column F
            "Power BI": 6,    # Column G
            "Python": 7,      # Column H
            "EDA": 8,         # Column I
            "ML": 9           # Column J
        }

        TASKS.clear() # Clear existing tasks, populate anew
        # Populate TASKS list from the keys of our fixed map
        for task_name in task_indices_map.keys():
            TASKS.append(task_name)

        if user_id_col >= len(header_row2) or name_col >= len(header_row2) or not TASKS or current_status_col >= len(header_row2):
            raise ValueError("Missing essential columns (User Id, Name, Current Status, or Task columns) based on fixed indices.")

        for row in values[2:]: # Start processing data from the third row (index 2)
            if not row or user_id_col >= len(row) or name_col >= len(row) or not row[user_id_col] or not row[name_col]:
                continue # Skip empty or incomplete rows

            student_id = str(row[user_id_col]).replace(',', '').strip()
            name = str(row[name_col]).strip()
            
            # Extract current status
            current_status = str(row[current_status_col]).strip() if current_status_col < len(row) else "N/A"
            
            performance = {}
            for task_name in TASKS:
                task_col_index = task_indices_map.get(task_name)
                if task_col_index is not None and task_col_index < len(row):
                    score_str = str(row[task_col_index]).strip()
                    if score_str in ['#N/A', ''] or not score_str.replace('.', '').replace('-', '').isdigit(): # Check for valid number, allow '-' for negative if applicable
                        score = 0.0 # Treat N/A, empty or non-numeric as 0
                    else:
                        score = float(score_str)
                else:
                    score = 0.0 # Task column not found or out of bounds for this row
                performance[task_name] = score
            
            # Calculate additional metrics
            scores = [s for s in performance.values() if s > 0] # Only consider positive scores for metrics
            avg_score = sum(scores) / len(scores) if scores else 0
            highest_score = max(scores) if scores else 0
            lowest_score = min(scores) if scores else 0
            
            # Determine performance level (same logic as frontend)
            if avg_score >= 90:
                level = "Excellent"
            elif avg_score >= 80:
                level = "Good"
            elif avg_score >= 70:
                level = "Satisfactory"
            elif avg_score >= 60:
                level = "Needs Improvement"
            else:
                level = "Poor"
            
            # Calculate trend (simplified for real data, could be enhanced)
            # Use a simple trend based on the last few tasks vs. earlier ones
            if len(scores) >= 3:
                recent_avg = sum(scores[-3:]) / 3
                earlier_scores_for_trend = scores[:-3]
                earlier_avg = sum(earlier_scores_for_trend) / len(earlier_scores_for_trend) if earlier_scores_for_trend else recent_avg

                if recent_avg > earlier_avg + 5: # Threshold for improving
                    trend = "Improving"
                elif recent_avg < earlier_avg - 5: # Threshold for declining
                    trend = "Declining"
                else:
                    trend = "Stable"
            else:
                trend = "Insufficient Data" # Not enough data points to determine trend
            
            student = {
                "id": student_id,
                "name": name,
                "performance": performance,
                "metrics": {
                    "average_score": round(avg_score, 1),
                    "highest_score": round(highest_score, 1),
                    "lowest_score": round(lowest_score, 1),
                    "total_tasks": len([s for s in performance.values() if s > 0]), # Count tasks with non-zero scores
                    "performance_level": level,
                    "trend": trend,
                    "completion_rate": round(len([s for s in performance.values() if s > 0]) / len(TASKS) * 100, 1) if TASKS else 0,
                    "current_status": current_status # Add current status to metrics
                }
            }
            students_data.append(student)
    except HttpError as err:
        print(f"Google Sheets API error: {err}")
        return []
    except Exception as e:
        print(f"Error processing Google Sheet data: {e}")
        return []
    
    return students_data

# --- Database Initialization and Data Loading ---

def init_db():
    with app.app_context():
        db.create_all() # Create tables if they don't exist
        if not Student.query.first(): # Only load data if the database is empty
            print("Database is empty. Attempting to fetch and load data from Google Sheet...")
            sheet_data = fetch_and_process_sheet_data_from_sheet() # Use a new function to fetch from sheet specifically
            if sheet_data:
                for student_data in sheet_data:
                    new_student = Student(
                        id=student_data["id"],
                        name=student_data["name"],
                        average_score=student_data["metrics"]["average_score"],
                        highest_score=student_data["metrics"]["highest_score"],
                        lowest_score=student_data["metrics"]["lowest_score"],
                        total_tasks=student_data["metrics"]["total_tasks"],
                        performance_level=student_data["metrics"]["performance_level"],
                        trend=student_data["metrics"]["trend"],
                        completion_rate=student_data["metrics"]["completion_rate"],
                        current_status=student_data["metrics"]["current_status"],
                        performance_json=json.dumps(student_data["performance"])
                    )
                    db.session.add(new_student)
                db.session.commit()
                print(f"Successfully loaded {len(sheet_data)} students from Google Sheet into the database.")
            else:
                print("No data fetched from Google Sheet. Database remains empty.")
        else:
            print("Database already contains data. Skipping Google Sheet data load.")

# Rename original fetch_and_process_sheet_data to avoid recursion and clarify intent
def fetch_and_process_sheet_data_from_sheet():
    global TASKS
    students_data = []
    service = get_sheets_service()
    range_name = f'{SHEET_NAME}!A:Q'

    try:
        result = service.spreadsheets().values().get(
            spreadsheetId=SPREADSHEET_ID,
            range=range_name
        ).execute()
        values = result.get('values', [])

        if not values or len(values) < 2: # Ensure at least two rows for headers + some data
            print("No data or insufficient header rows found in Google Sheet.")
            return []

        header_row1 = values[0]
        header_row2 = values[1]
        
        # Define fixed column indices based on the provided sheet structure
        user_id_col = 0 # Column A
        name_col = 1    # Column B
        current_status_col = 10 # Assuming 'Current Status' is in Column K (index 10)
        
        # Map task names to their fixed column indices (from first header row)
        task_indices_map = {
            "Spreadsheet": 4, # Column E
            "SQL": 5,         # Column F
            "Power BI": 6,    # Column G
            "Python": 7,      # Column H
            "EDA": 8,         # Column I
            "ML": 9           # Column J
        }

        TASKS.clear() # Clear existing tasks, populate anew
        # Populate TASKS list from the keys of our fixed map
        for task_name in task_indices_map.keys():
            TASKS.append(task_name)

        if user_id_col >= len(header_row2) or name_col >= len(header_row2) or not TASKS or current_status_col >= len(header_row2):
            raise ValueError("Missing essential columns (User Id, Name, Current Status, or Task columns) based on fixed indices.")

        for row in values[2:]: # Start processing data from the third row (index 2)
            if not row or user_id_col >= len(row) or name_col >= len(row) or not row[user_id_col] or not row[name_col]:
                continue # Skip empty or incomplete rows

            student_id = str(row[user_id_col]).replace(',', '').strip()
            name = str(row[name_col]).strip()
            
            # Extract current status
            current_status = str(row[current_status_col]).strip() if current_status_col < len(row) else "N/A"
            
            performance = {}
            for task_name in TASKS:
                task_col_index = task_indices_map.get(task_name)
                if task_col_index is not None and task_col_index < len(row):
                    score_str = str(row[task_col_index]).strip()
                    if score_str in ['#N/A', ''] or not score_str.replace('.', '').replace('-', '').isdigit(): # Check for valid number, allow '-' for negative if applicable
                        score = 0.0 # Treat N/A, empty or non-numeric as 0
                    else:
                        score = float(score_str)
                else:
                    score = 0.0 # Task column not found or out of bounds for this row
                performance[task_name] = score
            
            scores = [s for s in performance.values() if s > 0]
            avg_score = sum(scores) / len(scores) if scores else 0
            highest_score = max(scores) if scores else 0
            lowest_score = min(scores) if scores else 0
            
            if avg_score >= 90:
                level = "Excellent"
            elif avg_score >= 80:
                level = "Good"
            elif avg_score >= 70:
                level = "Satisfactory"
            elif avg_score >= 60:
                level = "Needs Improvement"
            else:
                level = "Poor"
            
            if len(scores) >= 3:
                recent_avg = sum(scores[-3:]) / 3
                earlier_scores_for_trend = scores[:-3]
                earlier_avg = sum(earlier_scores_for_trend) / len(earlier_scores_for_trend) if earlier_scores_for_trend else recent_avg

                if recent_avg > earlier_avg + 5:
                    trend = "Improving"
                elif recent_avg < earlier_avg - 5:
                    trend = "Declining"
                else:
                    trend = "Stable"
            else:
                trend = "Insufficient Data"
            
            student = {
                "id": student_id,
                "name": name,
                "performance": performance,
                "metrics": {
                    "average_score": round(avg_score, 1),
                    "highest_score": round(highest_score, 1),
                    "lowest_score": round(lowest_score, 1),
                    "total_tasks": len([s for s in performance.values() if s > 0]),
                    "performance_level": level,
                    "trend": trend,
                    "completion_rate": round(len([s for s in performance.values() if s > 0]) / len(TASKS) * 100, 1) if TASKS else 0,
                    "current_status": current_status # Add current status to metrics
                }
            }
            students_data.append(student)
    except HttpError as err:
        print(f"Google Sheets API error: {err}")
        return []
    except Exception as e:
        print(f"Error processing Google Sheet data: {e}")
        return []
    
    return students_data

# Initialize STUDENT_DATA at startup (now from DB)
# STUDENT_DATA = fetch_and_process_sheet_data()
with app.app_context():
    init_db()

@app.route('/')
def index():
    """Serve the main dashboard page"""
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "demo_mode": DEMO_MODE,
        "total_students": len(Student.query.all())
    })

@app.route('/api/students')
def get_students():
    """Get all students with basic information (now from Google Sheet)"""
    try:
        # Fetch students from the database instead of global variable
        students = Student.query.all()
        basic_students = [student.to_dict() for student in students]
        return jsonify(basic_students)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/student/<student_id>')
def get_student(student_id):
    """Get detailed information for a specific student (now from Google Sheet)"""
    try:
        # Fetch student from the database
        student = Student.query.get(student_id)
        if student:
            return jsonify(student.to_dict())
        else:
            return jsonify({"error": "Student not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_top_performers(limit=5):
    """Get top performing students from processed data"""
    if not Student.query.all():
        return []
    sorted_students = sorted(Student.query.all(), key=lambda x: x.average_score, reverse=True)
    return [
        {
            "id": student.id,
            "name": student.name,
            "average_score": student.average_score,
            "performance_level": student.performance_level
        }
        for student in sorted_students[:limit]
    ]

@app.route('/api/filter')
def filter_students():
    """Filter students based on criteria (now from Google Sheet)"""
    try:
        performance_level = request.args.get('level', 'all')
        min_score_param = request.args.get('min_score', '0')
        max_score_param = request.args.get('max_score', '100')

        min_score = float(min_score_param)
        max_score = float(max_score_param)
        
        query = Student.query

        if performance_level != 'all':
            if performance_level == 'excellent':
                query = query.filter(Student.average_score >= 90)
            elif performance_level == 'good':
                query = query.filter(Student.average_score >= 80, Student.average_score < 90)
            elif performance_level == 'satisfactory':
                query = query.filter(Student.average_score >= 70, Student.average_score < 80)
            elif performance_level == 'needs_improvement':
                query = query.filter(Student.average_score >= 60, Student.average_score < 70)
            elif performance_level == 'poor':
                query = query.filter(Student.average_score < 60)

        query = query.filter(Student.average_score >= min_score, Student.average_score <= max_score)
        
        filtered_students = [student.to_dict() for student in query.all()]
        
        return jsonify(filtered_students)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Starting Student Performance Dashboard...")
    if DEMO_MODE:
        print("DEMO MODE: Using dummy data.")
        print("If you intend to use Google Sheets, set DEMO_MODE = False and ensure GOOGLE_API_KEY is correct.")
    else:
        print(f"REAL DATA MODE: Attempting to fetch data from Google Sheet ID: {SPREADSHEET_ID}")
        print("Please ensure your Google API Key is valid and the sheet is publicly accessible or shared with the service account.")
        
    print("Access the dashboard at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000) 