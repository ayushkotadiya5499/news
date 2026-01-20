#!/bin/bash

# AI News Intelligence Backend - Test Script

echo "🧪 Testing AI News Intelligence Backend..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if server is running
check_server() {
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/)
    if [ $response -eq 200 ]; then
        echo -e "${GREEN}✅ Server is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Server is not running. Please start it first with ./run.sh${NC}"
        return 1
    fi
}

# Test endpoints
test_endpoints() {
    echo ""
    echo "Testing API endpoints..."
    echo "========================"
    
    # Test root endpoint
    echo ""
    echo "1. Testing root endpoint (GET /)..."
    curl -s http://localhost:8000/ | jq '.'
    
    # Test health endpoint
    echo ""
    echo "2. Testing health endpoint (GET /health)..."
    curl -s http://localhost:8000/health | jq '.'
    
    # Test login endpoint
    echo ""
    echo "3. Testing login (POST /auth/login)..."
    echo "   Using default admin credentials (username: admin, password: admin123)"
    TOKEN=$(curl -s -X POST "http://localhost:8000/auth/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=admin&password=admin123" | jq -r '.access_token')
    
    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
        echo -e "${GREEN}✅ Login successful! Token received.${NC}"
        
        # Test protected endpoint
        echo ""
        echo "4. Testing protected endpoint (GET /news/articles)..."
        curl -s -H "Authorization: Bearer $TOKEN" \
            "http://localhost:8000/news/articles?skip=0&limit=5" | jq '.'
        
        echo ""
        echo "5. Testing user profile (GET /auth/me)..."
        curl -s -H "Authorization: Bearer $TOKEN" \
            "http://localhost:8000/auth/me" | jq '.'
    else
        echo -e "${RED}❌ Login failed${NC}"
    fi
}

# Main execution
echo "Checking if server is running..."
if check_server; then
    test_endpoints
    echo ""
    echo -e "${GREEN}🎉 Testing complete!${NC}"
else
    echo ""
    echo "Please start the server first:"
    echo "  ./run.sh"
fi
