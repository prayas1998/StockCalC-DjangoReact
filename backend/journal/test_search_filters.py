from urllib.parse import urlencode

from django.test import TestCase
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from journal.models import TradeJournal
from journal.views.trade_views import TradeJournalViewSet


class JournalSearchCompanyFilterTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        for company in ('ACME, Inc', 'ACME', 'Inc', 'North Star, Inc', 'North Star', 'Second Co'):
            TradeJournal.objects.create(
                company_name=company,
                trade_type='EQUITY_DELIVERY',
                quantity=1,
                buy_price='10.00',
                entry_date='2026-01-01',
                status='OPEN',
            )

    def filtered_company_names(self, params):
        query_string = urlencode(params, doseq=True)
        request = Request(APIRequestFactory().get(f'/api/journal/search/?{query_string}'))
        view = TradeJournalViewSet()
        view.request = request
        return set(view._apply_filters(TradeJournal.objects.all()).values_list('company_name', flat=True))

    def test_repeated_company_values_preserve_names_with_commas(self):
        self.assertEqual(
            self.filtered_company_names([('company', 'ACME, Inc'), ('company', 'Second Co')]),
            {'ACME, Inc', 'Second Co'},
        )

    def test_singular_company_filters_take_precedence_over_legacy_plural_values(self):
        self.assertEqual(
            self.filtered_company_names([
                ('company', 'ACME, Inc'),
                ('companies', 'ACME'),
                ('companies', 'Inc'),
            ]),
            {'ACME, Inc'},
        )

    def test_legacy_companies_value_preserves_exact_comma_name(self):
        self.assertEqual(
            self.filtered_company_names({'companies': 'North Star, Inc'}),
            {'North Star, Inc'},
        )

    def test_repeated_legacy_companies_values_remain_supported(self):
        self.assertEqual(
            self.filtered_company_names([('companies', 'North Star'), ('companies', 'Second Co')]),
            {'North Star', 'Second Co'},
        )
