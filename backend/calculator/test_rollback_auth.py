import base64
from datetime import datetime, timezone
import json
from time import time
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory

from .authentication import AuthenticationUnavailable, SupabaseAuthentication
from .views.profile_views import change_password, delete_account


USER_ID = '11111111-1111-4111-8111-111111111111'
OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'
PROJECT_URL = 'https://trusted-project.invalid'
PUBLIC_KEY = 'sb_publishable_rollback_fixture'


def fixture_token(algorithm='HS256', **claims):
    def segment(value):
        return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')

    payload = {
        'sub': USER_ID,
        'iat': int(time()),
        'exp': int(time()) + 3600,
        'iss': 'https://issuer-claim.invalid/auth/v1',
        'email': 'stale@example.invalid',
        **claims,
    }
    return f"{segment({'alg': algorithm, 'typ': 'JWT'})}.{segment(payload)}.c3ludGhldGlj"


@override_settings(SUPABASE_URL=PROJECT_URL, SUPABASE_PUBLISHABLE_KEY=PUBLIC_KEY)
class RollbackAuthenticationTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.authenticator = SupabaseAuthentication()
        connection = patch('calculator.authentication.HTTPSConnection')
        self.https = connection.start()
        self.addCleanup(connection.stop)

    def provider_response(self, status=200, **values):
        body = {
            'id': USER_ID,
            'role': 'authenticated',
            'email': 'verified@example.invalid',
            'user_metadata': {'first_name': 'Verified'},
            **values,
        }
        self.https.return_value.getresponse.return_value = SimpleNamespace(
            status=status, read=lambda: json.dumps(body).encode()
        )

    def authenticate(self, token):
        request = self.factory.get('/api/journal/', HTTP_AUTHORIZATION=f'Bearer {token}')
        return self.authenticator.authenticate(request)

    def test_supported_token_algorithms_use_only_the_configured_auth_project(self):
        self.provider_response()
        for algorithm in ('HS256', 'ES256', 'RS256'):
            with self.subTest(algorithm=algorithm):
                self.https.reset_mock()
                token = fixture_token(algorithm)
                user, auth = self.authenticate(token)
                self.https.assert_called_once_with('trusted-project.invalid', None, timeout=5)
                self.https.return_value.request.assert_called_once_with('GET', '/auth/v1/user', headers={
                    'apikey': PUBLIC_KEY,
                    'Authorization': f'Bearer {token}',
                    'Accept': 'application/json',
                })
                self.assertEqual((user.id, user.pk, user.email), (USER_ID, USER_ID, 'verified@example.invalid'))
                self.assertEqual(user.first_name, 'Verified')
                self.assertTrue(user.is_authenticated)
                self.assertFalse(user.is_superuser)
                self.assertEqual(auth, token)

    def test_malformed_expired_and_empty_subject_tokens_stay_local(self):
        for token in ('malformed', fixture_token(exp=int(time()) - 1), fixture_token(sub='')):
            with self.subTest(token_format=token.count('.')):
                with self.assertRaises(AuthenticationFailed):
                    self.authenticate(token)
        self.https.assert_not_called()

    def test_provider_rejection_and_identity_mismatches_fail_closed(self):
        for status, fields in (
            (401, {}), (404, {}), (200, {'id': OTHER_USER_ID}), (200, {'role': 'anon'}),
            (200, {'email': None}), (200, {'is_anonymous': True}),
        ):
            with self.subTest(status=status, fields=fields):
                self.provider_response(status, **fields)
                with self.assertRaises(AuthenticationFailed):
                    self.authenticate(fixture_token())

    def test_redirect_and_provider_outage_are_unavailable_without_following_redirect(self):
        for status in (302, 503):
            with self.subTest(status=status):
                self.https.reset_mock()
                self.provider_response(status)
                with self.assertRaises(AuthenticationUnavailable):
                    self.authenticate(fixture_token())
                self.https.return_value.getresponse.assert_called_once()

    @override_settings(SUPABASE_URL='http://untrusted-project.invalid')
    def test_insecure_configuration_does_not_forward_bearer(self):
        with self.assertRaises(AuthenticationUnavailable):
            self.authenticate(fixture_token())
        self.https.assert_not_called()

    def test_profile_route_stays_closed_when_auth_is_missing_or_unavailable(self):
        path = '/api/profile/change-password/'
        response = change_password(self.factory.post(path))
        self.assertEqual(response.status_code, 401)
        self.https.assert_not_called()

        self.provider_response(503)
        request = self.factory.post(path, HTTP_AUTHORIZATION=f'Bearer {fixture_token()}')
        response = change_password(request)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn(PUBLIC_KEY, str(response.data))

    def test_registered_introspection_returns_only_verified_asymmetric_session_metadata(self):
        self.provider_response(email='Trader@users.tradesmart.local')
        path = reverse('calculator:token_introspection')
        issued_at = int(time()) - 30
        expires_at = issued_at + 3600
        token = fixture_token('ES256', iat=issued_at, exp=expires_at)
        response = self.client.get(path, secure=True, HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body['valid'])
        self.assertEqual(body['user'], {
            'id': USER_ID,
            'email': 'Trader@users.tradesmart.local',
            'username': 'trader',
            'is_authenticated': True,
            'is_active': True,
        })
        self.assertEqual(body['token_info']['issuer'], 'supabase')
        self.assertEqual(datetime.fromisoformat(body['token_info']['issued_at']), datetime.fromtimestamp(issued_at, tz=timezone.utc))
        self.assertEqual(datetime.fromisoformat(body['token_info']['expires_at']), datetime.fromtimestamp(expires_at, tz=timezone.utc))
        self.assertNotIn(token, response.content.decode())
        self.https.return_value.request.assert_called_once()

    def test_registered_introspection_rejects_unverified_session(self):
        self.provider_response(401)
        path = reverse('calculator:token_introspection')
        token = fixture_token('ES256')
        response = self.client.get(path, secure=True, HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['category'], 'authentication')
        self.assertNotIn(token, response.content.decode())
        self.assertNotIn(USER_ID, response.content.decode())

    def test_password_endpoint_reports_no_change_without_providing_instructions(self):
        self.provider_response()
        request = self.factory.post('/api/profile/change-password/', {
            'current_password': 'fixture-current',
            'new_password': 'fixture-new',
            'confirm_password': 'fixture-new',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {fixture_token()}')
        response = change_password(request)
        self.assertEqual(response.status_code, 501)
        self.assertEqual(response.data, {'message': 'This backend cannot change passwords. Your password is unchanged.'})
        self.assertEqual(self.https.return_value.request.call_count, 1)

    def test_delete_does_not_touch_data_when_django_admin_is_unavailable(self):
        self.provider_response()
        request = self.factory.delete('/api/profile/delete-account/', {'password': 'fixture-current'},
                                      format='json', HTTP_AUTHORIZATION=f'Bearer {fixture_token()}')
        with patch('calculator.views.profile_views.supabase_admin.is_configured', return_value=False), \
             patch('calculator.views.profile_views.supabase_admin.delete_user') as delete_user, \
             patch('journal.models.TradeJournal.objects.filter') as filter_trades, \
             patch('journal.models.TradeTags.objects.filter') as filter_tags:
            response = delete_account(request)
        self.assertEqual(response.status_code, 503)
        self.assertIn('account and data are unchanged', response.data['message'])
        delete_user.assert_not_called()
        filter_trades.assert_not_called()
        filter_tags.assert_not_called()
