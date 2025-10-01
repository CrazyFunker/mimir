#!/bin/bash

set -e

echo "Fetching AWS credentials from devops-ai-developer profile..."

# Fetch AWS credentials
CREDS=$(aws configure export-credentials --profile devops-ai-developer --format process)

if [ $? -ne 0 ]; then
    echo "Error: Failed to fetch AWS credentials. Please run 'aws sso login --profile devops-ai-developer' first."
    exit 1
fi

# Extract credentials using jq
AWS_ACCESS_KEY_ID=$(echo $CREDS | jq -r '.AccessKeyId')
AWS_SECRET_ACCESS_KEY=$(echo $CREDS | jq -r '.SecretAccessKey')
AWS_SESSION_TOKEN=$(echo $CREDS | jq -r '.SessionToken')

echo "Credentials fetched successfully"

# Update .env file
echo "Updating .env file with new credentials..."

# Escape special characters for sed
AWS_ACCESS_KEY_ID_ESCAPED=$(echo "$AWS_ACCESS_KEY_ID" | sed 's/[\/&]/\\&/g')
AWS_SECRET_ACCESS_KEY_ESCAPED=$(echo "$AWS_SECRET_ACCESS_KEY" | sed 's/[\/&]/\\&/g')
AWS_SESSION_TOKEN_ESCAPED=$(echo "$AWS_SESSION_TOKEN" | sed 's/[\/&]/\\&/g')

# Update each credential in .env file
sed -i.bak "s/^AWS_ACCESS_KEY_ID=.*/AWS_ACCESS_KEY_ID=\"$AWS_ACCESS_KEY_ID_ESCAPED\"/" .env
sed -i.bak "s/^AWS_SECRET_ACCESS_KEY=.*/AWS_SECRET_ACCESS_KEY=\"$AWS_SECRET_ACCESS_KEY_ESCAPED\"/" .env
sed -i.bak "s/^AWS_SESSION_TOKEN=.*/AWS_SESSION_TOKEN=\"$AWS_SESSION_TOKEN_ESCAPED\"/" .env

# Remove backup file
rm -f .env.bak

echo "Credentials updated in .env file"
echo "Starting docker compose..."

docker compose up -d --build
# docker compose logs -f
