#!/bin/bash
# Verify SES sender identity for the noreply email address
# This is required for LocalStack SES to send emails

awslocal ses verify-email-identity --email-address noreply@reasonbridge.org
echo "SES sender identity verified: noreply@reasonbridge.org"
