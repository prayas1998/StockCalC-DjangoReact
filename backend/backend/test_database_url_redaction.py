import contextlib
import importlib.util
import io
import os
import sys
import types
import traceback
import unittest
from pathlib import Path
from unittest.mock import patch

from .env_validation import EnvironmentValidationError, EnvironmentValidator


SETTINGS_PATH = Path(__file__).with_name("settings.py")
SYNTHETIC_PASSWORD = "ROTATION_TEST_PASSWORD_SENTINEL"


class DatabaseUrlRedactionTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            "DJANGO_ENV": "prod",
            "DEBUG_VALUE": "false",
            "DB_ENV": "prod",
            "DATABASE_URL": (
                f"postgresql://synthetic-user:{SYNTHETIC_PASSWORD}@localhost/app"
            ),
            "DJANGO_SECRET_KEY": "synthetic-django-secret-" * 3,
            "DJANGO_ALLOWED_HOSTS": "localhost",
            "SUPABASE_JWT_SECRET": "synthetic-jwt-secret-" * 3,
            "SUPABASE_URL": "https://example.supabase.invalid",
            "SUPABASE_SERVICE_ROLE_KEY": "synthetic-service-role-key",
            "SECURE_SSL_REDIRECT": "true",
        }, clear=True)
        self.environment.start()

    def tearDown(self):
        self.environment.stop()

    def load_settings(self, parse_database_url):
        dotenv_module = types.ModuleType("dotenv")
        dotenv_module.load_dotenv = lambda **kwargs: None
        database_url_module = types.ModuleType("dj_database_url")
        database_url_module.parse = parse_database_url
        module_name = f"{__package__}._synthetic_settings_test"
        spec = importlib.util.spec_from_file_location(module_name, SETTINGS_PATH)
        module = importlib.util.module_from_spec(spec)

        with patch.dict(sys.modules, {
            "dotenv": dotenv_module,
            "dj_database_url": database_url_module,
            module_name: module,
        }):
            stdout = io.StringIO()
            stderr = io.StringIO()
            error = None
            formatted_traceback = ""
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                try:
                    spec.loader.exec_module(module)
                except BaseException as caught:
                    error = caught
                    formatted_traceback = "".join(traceback.format_exception(caught))

        return module, stdout.getvalue(), stderr.getvalue(), error, formatted_traceback

    def test_url_validation_does_not_log_scheme_or_credentials(self):
        bad_url = f"unsupported://synthetic-user:{SYNTHETIC_PASSWORD}@localhost/app"
        with patch.dict(os.environ, {"SYNTHETIC_URL": bad_url}, clear=False):
            validator = EnvironmentValidator()
            self.assertIsNone(validator.validate_url("SYNTHETIC_URL", schemes=["postgresql"]))

        errors = "\n".join(validator.errors)
        self.assertIn("Invalid URL scheme", errors)
        self.assertNotIn("unsupported", errors)
        self.assertNotIn(SYNTHETIC_PASSWORD, errors)

    def test_malformed_port_error_does_not_reveal_database_url(self):
        malformed_url = (
            f"postgresql://synthetic-user:{SYNTHETIC_PASSWORD}@localhost:badport/app"
        )
        with patch.dict(os.environ, {"DATABASE_URL": malformed_url}, clear=False):
            def parse_database_url(url, conn_max_age):
                raise ValueError(f"Invalid port in {url}")

            _, stdout, stderr, error, formatted_traceback = self.load_settings(parse_database_url)

        self.assertIsInstance(error, EnvironmentValidationError)
        self.assertIn("Invalid database URL configuration", str(error))
        startup_output = stdout + stderr + formatted_traceback + str(error)
        self.assertNotIn(SYNTHETIC_PASSWORD, startup_output)
        self.assertNotIn("badport", startup_output)

    def test_valid_database_url_is_configured_without_being_printed(self):
        expected_database = {"ENGINE": "synthetic.database.backend"}
        module, stdout, stderr, error, formatted_traceback = self.load_settings(
            lambda url, conn_max_age: expected_database
        )

        self.assertIsNone(error)
        self.assertEqual(module.DATABASES["default"], expected_database)
        startup_output = stdout + stderr + formatted_traceback
        self.assertNotIn(SYNTHETIC_PASSWORD, startup_output)
        self.assertNotIn(os.environ["DATABASE_URL"], startup_output)


if __name__ == "__main__":
    unittest.main()
