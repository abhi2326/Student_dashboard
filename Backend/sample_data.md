# Sample Google Sheets Data Structure

To test the Student Performance Dashboard, create a Google Sheet with the following structure:

## Sheet Name: "Students"

| Student ID | Name | Week 1-Task 1 | Week 1-Task 2 | Week 2-Task 1 | Week 2-Task 2 | Week 3-Task 1 | Week 3-Task 2 |
|------------|------|----------------|----------------|----------------|----------------|----------------|----------------|
| S001 | John Smith | 85 | 92 | 78 | 88 | 90 | 85 |
| S002 | Jane Doe | 90 | 88 | 95 | 92 | 87 | 93 |
| S003 | Mike Johnson | 75 | 82 | 80 | 85 | 88 | 90 |
| S004 | Sarah Wilson | 88 | 95 | 92 | 89 | 94 | 91 |
| S005 | David Brown | 82 | 78 | 85 | 90 | 86 | 89 |
| S006 | Emily Davis | 95 | 92 | 88 | 94 | 91 | 96 |
| S007 | Chris Lee | 79 | 85 | 82 | 87 | 84 | 88 |
| S008 | Lisa Garcia | 91 | 88 | 93 | 90 | 89 | 92 |

## Important Notes:

1. **Sheet Name**: The first sheet must be named exactly "Students"
2. **Headers**: The first row should contain headers (Student ID, Name, then task names)
3. **Data Types**: 
   - Student ID and Name can be text
   - Performance scores should be numbers (0-100)
4. **Consistency**: Try to have consistent data across all students

## How to Get Your Spreadsheet ID:

1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
3. Copy the long string between `/d/` and `/edit`
4. Replace the `SPREADSHEET_ID` in `app.py` with your actual ID

## Testing the Dashboard:

1. Make sure your Google Sheet is accessible
2. Update the `SPREADSHEET_ID` in `app.py`
3. Run the application: `python app.py`
4. Open http://localhost:5000 in your browser
5. You should see all students listed in the sidebar
6. Click on any student to view their performance dashboard

## Troubleshooting:

- If you see "No students found", check that your sheet is named "Students"
- If you see authentication errors, make sure your `credentials.json` is properly set up
- If scores don't appear, ensure they are numeric values (not text) 