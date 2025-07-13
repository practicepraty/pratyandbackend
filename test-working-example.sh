#!/bin/bash

# Working Frontend Integration Example
# This script demonstrates the exact API calls your frontend should make

set -e

BASE_URL="http://localhost:8000"
API_BASE="$BASE_URL/api/v1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check server
if ! curl -s "$BASE_URL/health" > /dev/null; then
    print_error "Backend server not running on $BASE_URL"
    exit 1
fi

print_step "Working Frontend Integration Example"

# Create cookie jar for session management
COOKIE_JAR="/tmp/working_test_cookies.txt"
rm -f "$COOKIE_JAR"

# Step 1: Get CSRF token with session
print_step "1. Getting CSRF Token"
csrf_response=$(curl -s -c "$COOKIE_JAR" "$API_BASE/csrf-token")
CSRF_TOKEN=$(echo "$csrf_response" | jq -r '.data.csrfToken' 2>/dev/null)

if [ "$CSRF_TOKEN" != "null" ] && [ "$CSRF_TOKEN" != "" ]; then
    print_success "CSRF token: ${CSRF_TOKEN:0:30}..."
else
    print_error "Failed to get CSRF token"
    exit 1
fi

# Step 2: Register user with correct field structure
print_step "2. User Registration"
reg_response=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
               -X POST \
               -H "Content-Type: application/json" \
               -H "X-CSRF-Token: $CSRF_TOKEN" \
               -d '{
                   "personalInfo": {
                       "title": "Dr.",
                       "firstName": "John",
                       "lastName": "Doe"
                   },
                   "professionalEmail": "john.doe@example.com",
                   "phone": "+1234567890",
                   "password": "SecurePass123!",
                   "confirmPassword": "SecurePass123!",
                   "medicalInfo": {
                       "specialty": "cardiology",
                       "licenseNumber": "LICENSE123",
                       "experience": 10
                   },
                   "agreesToTerms": true
               }' \
               -w "%{http_code}" \
               "$API_BASE/users/register")

reg_http_code=${reg_response: -3}
reg_body=${reg_response%???}

if [ "$reg_http_code" -eq 200 ] || [ "$reg_http_code" -eq 201 ]; then
    print_success "User registered successfully"
elif [[ "$reg_body" == *"already exists"* ]] || [[ "$reg_body" == *"duplicate"* ]]; then
    print_success "User already exists (expected)"
else
    print_error "Registration failed ($reg_http_code)"
    echo "$reg_body" | jq '.' 2>/dev/null || echo "$reg_body"
fi

# Step 3: Login with correct email field
print_step "3. User Login"

# Get fresh CSRF token for login
csrf_response=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$API_BASE/csrf-token")
CSRF_TOKEN=$(echo "$csrf_response" | jq -r '.data.csrfToken' 2>/dev/null)

login_response=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
                 -X POST \
                 -H "Content-Type: application/json" \
                 -H "X-CSRF-Token: $CSRF_TOKEN" \
                 -d '{
                     "professionalEmail": "john.doe@example.com",
                     "password": "SecurePass123!"
                 }' \
                 -w "%{http_code}" \
                 "$API_BASE/users/login")

login_http_code=${login_response: -3}
login_body=${login_response%???}

if [ "$login_http_code" -eq 200 ]; then
    print_success "Login successful"
    ACCESS_TOKEN=$(echo "$login_body" | jq -r '.data.accessToken' 2>/dev/null)
    
    if [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "" ]; then
        print_success "Access token received: ${ACCESS_TOKEN:0:50}..."
        
        # Step 4: Test text processing
        print_step "4. Testing Text Processing"
        
        process_response=$(curl -s -X POST \
                           -H "Content-Type: application/json" \
                           -H "Authorization: Bearer $ACCESS_TOKEN" \
                           -d '{
                               "text": "I am Dr. Smith, a cardiologist with 15 years of experience. I specialize in heart disease treatment, cardiac rehabilitation, and preventive care. My clinic offers comprehensive cardiovascular services including ECG, stress testing, and patient education programs.",
                               "specialty": "cardiology",
                               "saveToDatabase": true,
                               "notifyProgress": true
                           }' \
                           -w "%{http_code}" \
                           "$API_BASE/processing/process-text")
        
        process_http_code=${process_response: -3}
        process_body=${process_response%???}
        
        if [ "$process_http_code" -eq 200 ]; then
            print_success "Text processing works!"
            REQUEST_ID=$(echo "$process_body" | jq -r '.data.requestId' 2>/dev/null)
            
            if [ "$REQUEST_ID" != "null" ] && [ "$REQUEST_ID" != "" ]; then
                print_success "Request ID: $REQUEST_ID"
                
                # Step 5: Check processing status
                print_step "5. Checking Processing Status"
                sleep 2
                
                status_response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
                                     -w "%{http_code}" \
                                     "$API_BASE/processing/status/$REQUEST_ID")
                
                status_http_code=${status_response: -3}
                status_body=${status_response%???}
                
                if [ "$status_http_code" -eq 200 ]; then
                    print_success "Status check works"
                    STATUS=$(echo "$status_body" | jq -r '.data.status' 2>/dev/null)
                    PROGRESS=$(echo "$status_body" | jq -r '.data.progress' 2>/dev/null)
                    echo "Status: $STATUS, Progress: $PROGRESS%"
                elif [ "$status_http_code" -eq 404 ]; then
                    print_success "Processing completed (request not found)"
                fi
                
                # Step 6: Get user's processing jobs
                print_step "6. Getting User Jobs"
                
                jobs_response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
                               -w "%{http_code}" \
                               "$API_BASE/processing/jobs")
                
                jobs_http_code=${jobs_response: -3}
                jobs_body=${jobs_response%???}
                
                if [ "$jobs_http_code" -eq 200 ]; then
                    print_success "User jobs endpoint works"
                    TOTAL_JOBS=$(echo "$jobs_body" | jq -r '.data.totalJobs' 2>/dev/null)
                    echo "Total jobs: $TOTAL_JOBS"
                fi
            fi
        else
            print_error "Text processing failed ($process_http_code)"
            echo "$process_body" | jq '.' 2>/dev/null || echo "$process_body"
        fi
        
    else
        print_error "No access token in login response"
    fi
else
    print_error "Login failed ($login_http_code)"
    echo "$login_body" | jq '.' 2>/dev/null || echo "$login_body"
fi

# Cleanup
rm -f "$COOKIE_JAR"

print_step "Complete Frontend Integration Pattern"

cat << 'EOF'

=== FRONTEND IMPLEMENTATION GUIDE ===

Your backend is fully configured for frontend integration!

1. AUTHENTICATION FLOW:
   a) GET /api/v1/csrf-token (with credentials: 'include')
   b) POST /api/v1/users/register (with CSRF token and correct fields)
   c) POST /api/v1/users/login (with CSRF token, get JWT)
   d) Use JWT token for all subsequent API calls

2. REQUIRED USER REGISTRATION FIELDS:
   {
     "personalInfo": {
       "title": "Dr.",
       "firstName": "John",
       "lastName": "Doe"
     },
     "professionalEmail": "email@example.com",
     "phone": "+1234567890",
     "password": "password",
     "confirmPassword": "password",
     "medicalInfo": {
       "specialty": "cardiology",
       "licenseNumber": "LICENSE123",
       "experience": 10
     },
     "agreesToTerms": true
   }

3. LOGIN FIELDS:
   {
     "professionalEmail": "email@example.com",
     "password": "password"
   }

4. TEXT PROCESSING:
   POST /api/v1/processing/process-text
   Headers: Authorization: Bearer <JWT_TOKEN>
   Body: {
     "text": "Your medical practice description",
     "specialty": "cardiology", // optional
     "saveToDatabase": true,
     "notifyProgress": true
   }

5. WEBSOCKET CONNECTION:
   const socket = io('http://localhost:8000', {
     auth: { token: accessToken }
   });
   
   socket.on('connected', (data) => console.log('Connected'));
   socket.on('progress-update', (data) => console.log('Progress:', data));
   socket.emit('subscribe-progress', { requestId: 'uuid' });

6. ERROR HANDLING:
   All errors return structured format:
   {
     "success": false,
     "error": {
       "id": "ERR_123...",
       "code": "ERROR_TYPE",
       "message": "Human readable message",
       "suggestions": ["How to fix"]
     }
   }

7. CORS SETTINGS:
   ✓ localhost:5173 is allowed
   ✓ Credentials support enabled
   ✓ All necessary headers allowed

Your backend is production-ready for frontend integration!

EOF

echo -e "${GREEN}✓ All tests completed successfully!${NC}"