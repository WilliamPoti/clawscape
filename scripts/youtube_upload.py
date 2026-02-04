#!/usr/bin/env python3
"""
YouTube Video Uploader for Future Buddy demos
Usage: python youtube_upload.py <video_file> --title "Title" --description "Desc"
"""

import os
import sys
import argparse
import pickle
from pathlib import Path

from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
CLIENT_SECRETS_FILE = Path(__file__).parent.parent / 'client_secrets.json'
TOKEN_FILE = Path(__file__).parent.parent / '.youtube_token.pickle'

def get_authenticated_service():
    """Get authenticated YouTube service."""
    credentials = None

    # Load saved credentials
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE, 'rb') as token:
            credentials = pickle.load(token)

    # Refresh or get new credentials
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CLIENT_SECRETS_FILE), SCOPES
            )
            credentials = flow.run_local_server(port=8080)

        # Save credentials
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(credentials, token)

    return build('youtube', 'v3', credentials=credentials)

def upload_video(youtube, video_file, title, description, tags=None, category='20', privacy='public'):
    """Upload a video to YouTube."""

    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': tags or ['Future Buddy', 'gamedev', 'indie', 'demo'],
            'categoryId': category  # 20 = Gaming
        },
        'status': {
            'privacyStatus': privacy,
            'selfDeclaredMadeForKids': False
        }
    }

    media = MediaFileUpload(
        video_file,
        mimetype='video/webm',
        resumable=True
    )

    request = youtube.videos().insert(
        part=','.join(body.keys()),
        body=body,
        media_body=media
    )

    print(f'Uploading: {video_file}')
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f'Progress: {int(status.progress() * 100)}%')

    video_id = response['id']
    video_url = f'https://www.youtube.com/watch?v={video_id}'
    print(f'Upload complete!')
    print(f'URL: {video_url}')

    return video_url

def main():
    parser = argparse.ArgumentParser(description='Upload video to YouTube')
    parser.add_argument('video_file', help='Path to video file')
    parser.add_argument('--title', '-t', required=True, help='Video title')
    parser.add_argument('--description', '-d', default='', help='Video description')
    parser.add_argument('--tags', nargs='+', help='Video tags')
    parser.add_argument('--privacy', choices=['public', 'private', 'unlisted'], default='public')
    parser.add_argument('--shorts', action='store_true', help='Mark as YouTube Shorts')

    args = parser.parse_args()

    if not os.path.exists(args.video_file):
        print(f'Error: Video file not found: {args.video_file}')
        sys.exit(1)

    # Add #Shorts to title if it's a short
    title = args.title
    if args.shorts and '#Shorts' not in title:
        title = f'{title} #Shorts'

    youtube = get_authenticated_service()
    url = upload_video(
        youtube,
        args.video_file,
        title,
        args.description,
        args.tags,
        privacy=args.privacy
    )

    # Output just the URL for scripting
    print(f'\n{url}')

if __name__ == '__main__':
    main()
