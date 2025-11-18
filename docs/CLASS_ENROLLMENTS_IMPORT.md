# Class Enrollments Import

This document describes the system for importing historical class enrollments with student grades.

## Overview

The class enrollments import system allows bulk uploading of historical enrollment data from Excel files. The system:

1. Converts Excel data to JSONL format (grouping students by class)
2. Imports classes and enrollments into Convex database
3. Automatically calculates letter grades, grade points, and quality points
4. Supports idempotent imports (can be run multiple times safely)

## Files

### Core Files
- `scripts/class-enrollments-excel-to-jsonl.ts` - Converts Excel to JSONL
- `convex/class_enrollments.ts` - Action for importing data
- `lib/class-enrollments/types.ts` - TypeScript types
- `lib/class-enrollments/utils.ts` - Helper functions
- `components/class-enrollment/class-enrollment-import-dialog.tsx` - UI component

### Data Files
- `public/data/class_enrollments.xlsx` - Source Excel file
- `public/data/class_enrollments.jsonl` - Generated JSONL file (519 classes, 738 enrollments)

## Excel Format

The Excel file must have the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| `programId` | Program code | `01L` |
| `courseId` | Course code | `CCOU - 08` |
| `professorEmail` | Professor's email | `professor@example.com` |
| `studentId` | Student code | `01L-2021-01` |
| `percentageGrade` | Grade (0-100) | `91` |
| `bimesterName` | Bimester name | `2021 Bimester I` |
| `groupNumber` | Group number | `1` |

## Step 1: Convert Excel to JSONL

Run the conversion script:

```bash
npx tsx scripts/class-enrollments-excel-to-jsonl.ts
```

This will:
- Read `public/data/class_enrollments.xlsx`
- Group rows by unique class (programId, courseId, bimesterName, groupNumber, professorEmail)
- Generate `public/data/class_enrollments.jsonl`

### Output Format

Each line in the JSONL file represents one class:

```json
{
  "programCode": "01L",
  "courseCode": "CCOU - 08",
  "bimesterName": "2021 Bimester I",
  "groupNumber": "1",
  "professorEmail": "professor@example.com",
  "students": [
    {"studentCode": "01L-2021-01", "percentageGrade": 91},
    {"studentCode": "01L-2023-04", "percentageGrade": 88.6}
  ]
}
```

## Step 2: Import via UI

1. Navigate to the Students page (`/students`)
2. Click "Import Class Enrollments" button
3. Select the `class_enrollments.jsonl` file
4. Click "Start Import"
5. Wait for the import to complete

### Import Process

For each class in the JSONL:

1. **Resolve IDs** - Maps codes/names to database IDs:
   - `programCode` → `programId` (from `programs` table)
   - `courseCode` → `courseId` (from `courses` table)
   - `bimesterName` → `bimesterId` (from `bimesters` table)
   - `professorEmail` → `professorId` (from `users` table)
   - `studentCode` → `studentId` (from `users.studentProfile.studentCode`)

2. **Create/Find Class**:
   - Checks if class already exists (by courseId, bimesterId, groupNumber, programId)
   - Creates new class if it doesn't exist
   - Uses existing class if found

3. **Process Students**:
   - For each student in the class:
     - Creates enrollment (if doesn't exist) or updates existing
     - Sets grade using `updateEnrollmentGradeForImport` mutation
     - Sets status to "completed"

### Grade Calculation

Grades are automatically calculated using the American grading system:

| Percentage | Letter | Grade Points (4.0 scale) |
|-----------|--------|--------------------------|
| 97-100    | A+     | 4.0 |
| 93-96     | A      | 4.0 |
| 90-92     | A-     | 3.7 |
| 87-89     | B+     | 3.3 |
| 83-86     | B      | 3.0 |
| 80-82     | B-     | 2.7 |
| 77-79     | C+     | 2.3 |
| 73-76     | C      | 2.0 |
| 70-72     | C-     | 1.7 |
| 67-69     | D+     | 1.3 |
| 65-66     | D      | 1.0 |
| 0-64      | F      | 0.0 |

Quality points are calculated as: `gradePoints × credits`

Credits are retrieved from the `program_courses` table based on the class's program and course.

## Import Results

After import completes, you'll see:

- **Classes Processed**: Total classes in JSONL
- **Classes Created**: New classes added to database
- **Classes Already Existed**: Classes that were already in database
- **Enrollments Created**: New student enrollments added
- **Enrollments Updated**: Existing enrollments that were updated

### Warnings

Warnings are non-fatal issues:
- Class already exists (uses existing class)

### Errors

Errors prevent specific records from being imported:
- `program_not_found` - Program code not found in database
- `course_not_found` - Course code not found in database
- `bimester_not_found` - Bimester name not found in database
- `professor_not_found` - Professor email not found in database
- `student_not_found` - Student code not found in database
- `invalid_grade` - Grade is not between 0-100
- `class_creation_failed` - Failed to create class
- `enrollment_failed` - Failed to create/update enrollment

## Idempotency

The import is **idempotent** - you can run it multiple times safely:

- Classes are checked before creation (by courseId, bimesterId, groupNumber, programId)
- Enrollments are checked before creation (by classId, studentId)
- Existing enrollments are updated with new grades if re-imported

## Data Requirements

Before importing, ensure:

1. ✅ All programs exist in `programs` table with correct codes
2. ✅ All courses exist in `courses` table with correct codes
3. ✅ All bimesters exist in `bimesters` table with correct names
4. ✅ All professors exist in `users` table with correct emails and `role="professor"`
5. ✅ All students exist in `users` table with correct student codes in `studentProfile.studentCode`
6. ✅ All `program_courses` associations exist with correct credits

## Convex Functions

### Queries
- `getAllPrograms` - Get all programs
- `getAllCourses` - Get all courses
- `getAllBimesters` - Get all bimesters
- `getAllUsers` - Get all users
- `getClassesByCourse` - Get classes for a course
- `getClassEnrollments` - Get enrollments for a class

### Mutations
- `createClass` - Create a new class
- `addStudentToClass` - Add student to class (creates enrollment)
- `updateEnrollmentGradeForImport` - Update grade without grading period validation
- `updateEnrollmentStatus` - Update enrollment status

### Actions
- `importClassEnrollmentsFromJSONL` - Main import action

## Testing

Test with a small subset first:

1. Create a test JSONL with 2-3 classes
2. Import via UI
3. Verify:
   - Classes are created correctly
   - Enrollments have correct students
   - Grades are calculated correctly (letter, points, quality points)
   - Status is "completed"
4. Re-import the same file to test idempotency
5. Verify no duplicates were created

## Troubleshooting

### "Program not found"
- Check program codes in Excel match codes in `programs` table
- Codes are case-insensitive and whitespace is trimmed

### "Course not found"
- Check course codes in Excel match codes in `courses` table
- Ensure spaces and hyphens match exactly

### "Bimester not found"
- Check bimester names in Excel match `name` field in `bimesters` table
- Names must match exactly (case-sensitive)

### "Professor not found"
- Check professor emails exist in `users` table
- Verify `role` is set to "professor"
- Emails are case-insensitive

### "Student not found"
- Check student codes exist in `users.studentProfile.studentCode`
- Verify `role` is set to "student"
- Codes are case-insensitive

### Import is slow
- The import processes ~519 classes with ~738 enrollments
- Expected time: 2-5 minutes depending on network
- Progress is shown in the UI

## Cleanup

After successful import, you can:

1. Remove the temporary import button from `components/student/student-actions.tsx`
2. Archive the Excel and JSONL files
3. Document which bimesters have been imported

## Future Improvements

Potential enhancements:

- [ ] Batch processing (process in chunks of 50 classes)
- [ ] Progress percentage display
- [ ] Download error report as CSV
- [ ] Dry-run mode (validate without importing)
- [ ] Support for updating existing grades
- [ ] Import from CSV format directly
- [ ] Automatic backup before import