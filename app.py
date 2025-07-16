# Alternative 1: Public Google Sheet with API Key (Simplest)
import requests
import pandas as pd
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_cors import CORS
import json
import random
import math
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# Configuration for public sheet access
SPREADSHEET_ID = '1asFR89OBzgP4CpfLfgbwq9HMhuzqhzhbSiV--rZBnYc'  # Your sheet ID
API_KEY = 'AIzaSyAaYseBBgOigjMsJLAc9MdDAcagyvHDh2o'  # Get this from Google Cloud Console (much simpler than OAuth2)

def get_dataframe_from_public_sheet(sheet_name):
    """Get DataFrame from PUBLIC Google Sheets using API key"""
    try:
        # Google Sheets API URL for public sheets
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{sheet_name}?key={API_KEY}"
        
        print(f"📥 Fetching {sheet_name} from public Google Sheet...")
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            values = data.get('values', [])
            
            if not values:
                print(f"⚠ Sheet '{sheet_name}' is empty")
                return pd.DataFrame()
            
            # Convert to DataFrame
            df = pd.DataFrame(values)
            
            # Set headers from row 1 and data from row 2+
            if len(df) > 1:
                df.columns = df.iloc[1]
                df = df.iloc[2:]
            
            print(f"✅ Loaded {sheet_name}: {len(df)} rows")
            return df.reset_index(drop=True)
            
        else:
            print(f"❌ Error fetching {sheet_name}: {response.status_code}")
            print(f"Response: {response.text}")
            return pd.DataFrame()
            
    except Exception as e:
        print(f"❌ Error fetching sheet '{sheet_name}': {e}")
        return pd.DataFrame()

# Alternative 2: Direct CSV export (No API key needed)
def get_dataframe_from_csv_export(sheet_name):
    """Get DataFrame from Google Sheets CSV export (requires public sheet)"""
    try:
        # Google Sheets CSV export URL format
        if sheet_name == 'Student Performance':
            gid = '0'  # Usually 0 for first sheet, you might need to find the actual GID
        elif sheet_name == 'Task dump':
            gid = '1234567890'  # Replace with actual GID of the sheet
        else:
            gid = '0'
        
        csv_url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={gid}"
        
        print(f"📥 Fetching {sheet_name} via CSV export...")
        df = pd.read_csv(csv_url)
        
        print(f"✅ Loaded {sheet_name}: {len(df)} rows")
        return df
        
    except Exception as e:
        print(f"❌ Error fetching sheet '{sheet_name}' via CSV: {e}")
        return pd.DataFrame()

# Your exact data extraction pattern - now with simple public access
def get_dataframe_from_sheet(sheet_name):
    """Your exact function - now uses public sheet access"""
    
    # Try method 1: API key (if you have it)
    if API_KEY and API_KEY != 'YOUR_API_KEY_HERE':
        return get_dataframe_from_public_sheet(sheet_name)
    
    # Try method 2: CSV export (no API key needed)
    else:
        return get_dataframe_from_csv_export(sheet_name)

# List of sheet names to fetch
sheet_names = ['Student Performance', 'Task dump']

print("🔄 Using PUBLIC Google Sheets access...")

# Loop through the sheet names and get DataFrames
dfs = {}
for sheet_name in sheet_names:
    dfs[sheet_name] = get_dataframe_from_sheet(sheet_name)

# Access the dataframes like this:
Student_Performance_df = dfs['Student Performance']
Task_dump_df = dfs['Task dump']

def process_student_data_from_dataframe(df):
    """Process student data from the loaded DataFrame"""
    if df.empty:
        print("❌ DataFrame is empty - no student data to process")
        return []
    
    students_data = []
    
    try:
        task_columns = {
            "Spreadsheet": 4,  # Column E
            "SQL": 5,          # Column F  
            "Power BI": 6,     # Column G
            "Python": 7,       # Column H
            "EDA": 8,          # Column I
            "ML": 9            # Column J
        }
        
        print(f"Processing {len(df)} rows from Google Sheets...")
        
        for index, row in df.iterrows():
            if pd.isna(row.iloc[0]) or pd.isna(row.iloc[1]):
                continue
                
            student_id = str(row.iloc[0]).strip()
            name = str(row.iloc[1]).strip()
            current_status = str(row.iloc[10]).strip() if len(row) > 10 else "Active"
            
            performance = {}
            for task_name, col_index in task_columns.items():
                if col_index < len(row):
                    score_str = str(row.iloc[col_index]).strip()
                    if score_str in ['#N/A', '', 'nan', 'None'] or not score_str.replace('.', '').replace('-', '').isdigit():
                        score = 0.0
                    else:
                        score = float(score_str)
                else:
                    score = 0.0
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
                earlier_scores = scores[:-3]
                earlier_avg = sum(earlier_scores) / len(earlier_scores) if earlier_scores else recent_avg
                
                if recent_avg > earlier_avg + 5:
                    trend = "Improving"
                elif recent_avg < earlier_avg - 5:
                    trend = "Declining"
                else:
                    trend = "Stable"
            else:
                trend = "Insufficient Data"
            
            student_data = {
                "id": student_id,
                "name": name,
                "performance": performance,
                "metrics": {
                    "average_score": round(avg_score, 1),
                    "highest_score": round(highest_score, 1),
                    "lowest_score": round(lowest_score, 1),
                    "total_tasks": len(scores),
                    "performance_level": level,
                    "trend": trend,
                    "completion_rate": round(len(scores) / len(task_columns) * 100, 1),
                    "current_status": current_status
                }
            }
            students_data.append(student_data)
            
        print(f"✓ Successfully processed {len(students_data)} students")
        return students_data
            
    except Exception as e:
        print(f"❌ Error processing student data: {e}")
        return []

# Initialize data from your sheets ONLY
STUDENT_DATA = []
TASKS = ["Spreadsheet", "SQL", "Power BI", "Python", "EDA", "ML"]

print("\n🎯 PROCESSING STUDENT DATA...")

if not Student_Performance_df.empty:
    STUDENT_DATA = process_student_data_from_dataframe(Student_Performance_df)
    if STUDENT_DATA:
        print(f"✅ Successfully loaded {len(STUDENT_DATA)} students from Google Sheets")
    else:
        print("❌ No valid student data found in Google Sheets")
        print("📋 DataFrame preview:")
        print(Student_Performance_df.head())
else:
    print("❌ CRITICAL ERROR: Student Performance sheet is empty or failed to load")
    print("📋 Please check:")
    print("1. Sheet is PUBLIC (shared with 'Anyone with the link')")
    print("2. Sheet name is exactly 'Student Performance'")
    print("3. Sheet contains data")

print(f"\n📊 Final Status: {len(STUDENT_DATA)} students ready for dashboard")

# Continue with Flask app regardless - for debugging
print("🚀 Starting Flask application...")

# Flask routes (same as before)
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    return jsonify({
        "status": "healthy" if STUDENT_DATA else "no_data",
        "timestamp": datetime.now().isoformat(),
        "data_source": "Public Google Sheets",
        "total_students": len(STUDENT_DATA),
        "tasks": TASKS,
        "sheets_loaded": {
            "student_performance": len(Student_Performance_df),
            "task_dump": len(Task_dump_df)
        }
    })

@app.route('/api/students')
def get_students():
    try:
        if not STUDENT_DATA:
            return jsonify({"error": "No student data available from Google Sheets"}), 404
        return jsonify(STUDENT_DATA)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/student/<student_id>')
def get_student(student_id):
    try:
        if not STUDENT_DATA:
            return jsonify({"error": "No student data available from Google Sheets"}), 404
            
        student = next((s for s in STUDENT_DATA if s["id"] == student_id), None)
        if student:
            return jsonify(student)
        else:
            return jsonify({"error": "Student not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/filter')
def filter_students():
    try:
        performance_level = request.args.get('level', 'all')
        min_score = float(request.args.get('min_score', '0'))
        max_score = float(request.args.get('max_score', '100'))
        
        filtered_students = []
        
        for student in STUDENT_DATA:
            avg_score = student["metrics"]["average_score"]
            
            if performance_level != 'all':
                if performance_level == 'excellent' and avg_score < 90:
                    continue
                elif performance_level == 'good' and (avg_score < 80 or avg_score >= 90):
                    continue
                elif performance_level == 'satisfactory' and (avg_score < 70 or avg_score >= 80):
                    continue
                elif performance_level == 'needs_improvement' and (avg_score < 60 or avg_score >= 70):
                    continue
                elif performance_level == 'poor' and avg_score >= 60:
                    continue
            
            if min_score <= avg_score <= max_score:
                filtered_students.append(student)
        
        return jsonify(filtered_students)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/refresh')
def refresh_data():
    global STUDENT_DATA, Student_Performance_df, Task_dump_df
    try:
        print("🔄 Refreshing data from Google Sheets...")
        
        dfs_refresh = {}
        for sheet_name in sheet_names:
            dfs_refresh[sheet_name] = get_dataframe_from_sheet(sheet_name)
        
        Student_Performance_df = dfs_refresh['Student Performance']
        Task_dump_df = dfs_refresh['Task dump']
        
        if not Student_Performance_df.empty:
            STUDENT_DATA = process_student_data_from_dataframe(Student_Performance_df)
            return jsonify({
                "status": "success", 
                "message": f"Refreshed {len(STUDENT_DATA)} students from Google Sheets",
                "students_count": len(STUDENT_DATA)
            })
        else:
            STUDENT_DATA = []
            return jsonify({
                "status": "error", 
                "message": "No data found in Google Sheets after refresh"
            }), 404
            
    except Exception as e:
        return jsonify({"error": f"Failed to refresh data: {str(e)}"}), 500

@app.route('/api/tasks')
def get_tasks():
    try:
        if Task_dump_df.empty:
            return jsonify({'error': 'No tasks data available'}), 404
        # Convert DataFrame to list of dicts with all relevant columns
        tasks = []
        for _, row in Task_dump_df.iterrows():
            task = {
                'user_id': str(row.get('user_id', row.iloc[0])),
                'student_name': str(row.get('student_name', row.iloc[1])),
                'placement_coach': str(row.get('placement_coach', row.iloc[2])),
                'batch_au': str(row.get('batch_au', row.iloc[3])),
                'batch_lu': str(row.get('batch_lu', row.iloc[4])),
                'assigned_at': str(row.get('assigned_at', row.iloc[5])),
                'target_id': str(row.get('target_id', row.iloc[6])),
                'completed_at': str(row.get('completed_at', row.iloc[7])),
                'deadline': str(row.get('deadline', row.iloc[8])),
                'completion_status': str(row.get('completion_status', row.iloc[9])),
                'marked_completed_by_assignee': str(row.get('marked_completed_by_assignee', row.iloc[10])),
                'marked_completed_by_assignee_at': str(row.get('marked_completed_by_assignee_at', row.iloc[11])),
                'title': str(row.get('title', row.iloc[12])),
                'description': str(row.get('description', row.iloc[13]))
            }
            tasks.append(task)
        return jsonify(tasks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("🎓 STUDENT PERFORMANCE DASHBOARD")
    print("=" * 60)
    print(f"📊 Data Source: Public Google Sheets")
    print(f"📈 Students Loaded: {len(STUDENT_DATA)}")
    print(f"📋 Sheets Available:")
    print(f"   - Student Performance: {len(Student_Performance_df)} rows")
    print(f"   - Task Dump: {len(Task_dump_df)} rows")
    print("=" * 60)
    print("🌐 Dashboard URL: http://localhost:5000")
    print("🔍 Health Check: http://localhost:5000/api/health")  
    print("📋 Students API: http://localhost:5000/api/students")
    print("=" * 60)
    print("🚀 Starting Flask server...")
    
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        print(f"❌ Failed to start Flask server: {e}")
        print("🔧 Try running on a different port:")
        print("   app.run(debug=True, host='0.0.0.0', port=8080)")
    
    print("👋 Flask server stopped.")