import json

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.gdpr import export_user_data

User = get_user_model()


class Command(BaseCommand):
    help = "Export GDPR data bundle for a user (stdout JSON). Staff use only."

    def add_arguments(self, parser):
        parser.add_argument("username")

    def handle(self, *args, **opts):
        user = User.objects.filter(username=opts["username"]).first()
        if not user:
            self.stderr.write("User not found")
            raise SystemExit(1)
        data = export_user_data(user)
        self.stdout.write(json.dumps(data, indent=2, default=str))
