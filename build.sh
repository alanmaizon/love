# build.sh
#!/bin/bash
set -e  # Exit immediately if any command fails

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate