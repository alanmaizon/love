from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.gdpr import erase_user_data

User = get_user_model()


class Command(BaseCommand):
    help = "GDPR erasure: deactivate user and anonymize linked donor PII. Staff use only."

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Required flag to execute erasure",
        )

    def handle(self, *args, **opts):
        if not opts["confirm"]:
            self.stderr.write("Pass --confirm to execute erasure.")
            raise SystemExit(1)
        user = User.objects.filter(username=opts["username"]).first()
        if not user:
            self.stderr.write("User not found")
            raise SystemExit(1)
        if user.is_superuser:
            self.stderr.write("Refusing to erase a superuser.")
            raise SystemExit(1)
        summary = erase_user_data(user)
        self.stdout.write(self.style.SUCCESS(f"Erased: {summary}"))
