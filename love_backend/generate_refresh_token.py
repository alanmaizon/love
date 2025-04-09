import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow

# Load credentials from the GOOGLE_CREDENTIALS environment variable
credentials_json = os.getenv('GOOGLE_CREDENTIALS')
if not credentials_json:
    raise ValueError("GOOGLE_CREDENTIALS environment variable is not set or empty.")

credentials_info = json.loads(credentials_json)

# Define the required scopes
SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']

# Run the OAuth2 flow
flow = InstalledAppFlow.from_client_config(credentials_info, SCOPES)
credentials = flow.run_local_server(port=8080, prompt='consent')

# Output the refresh token
print("Refresh Token:", credentials.refresh_token)