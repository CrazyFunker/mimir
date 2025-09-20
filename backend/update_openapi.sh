#!/bin/bash
# This script updates the openapi.json file by fetching it from the running API server.
curl -o openapi.json http://localhost:8000/openapi.json
echo "openapi.json has been updated."
