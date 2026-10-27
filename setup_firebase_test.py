import copy
import json
from pathlib import Path
import re
import unittest
from unittest.mock import patch
from setup_firebase import merge_rules, parse_rules, request, PROJECT, SetupError

class RequestTests(unittest.TestCase):
    @patch('setup_firebase.urllib.request.urlopen')
    def test_authenticated_request_sets_quota_project(self, urlopen):
        urlopen.return_value.__enter__.return_value.read.return_value = b'{}'
        request('https://identitytoolkit.googleapis.com/admin/v2/projects/cybr-view/config', 'test-token')
        headers = dict((k.lower(), v) for k, v in urlopen.call_args.args[0].header_items())
        self.assertEqual(headers['x-goog-user-project'], PROJECT)
        self.assertEqual(headers['authorization'], 'Bearer test-token')

    @patch('setup_firebase.urllib.request.urlopen')
    def test_public_request_has_no_authentication_or_quota_header(self, urlopen):
        urlopen.return_value.__enter__.return_value.read.return_value = b'{}'
        request('https://raw.githubusercontent.com/Capybara0606/CRYR-FACTU/main/firebase/billing.rules.json')
        headers = dict((k.lower(), v) for k, v in urlopen.call_args.args[0].header_items())
        self.assertNotIn('authorization', headers)
        self.assertNotIn('x-goog-user-project', headers)

class RulesTests(unittest.TestCase):
    def test_history_rules_match_cloud_shell_correction(self):
        addition = json.loads(Path(__file__).with_name('firebase').joinpath('billing.rules.json').read_text())
        history = addition['kiruBilling']['v1']['users']['$uid']['history']
        self.assertNotIn('.validate', history)
        rule = history['$entry']['.validate']
        keys, validation = rule.split(') && (', 1)
        self.assertEqual(re.findall(r"\$entry === '([^']+)'", keys), [str(i) for i in range(20)])
        self.assertEqual(validation, "newData.hasChildren(['at', 'payload']) && newData.child('at').isString() && newData.child('payload').isString())")
        existing = {'rules': {'cybrview': {'.read': 'auth != null'}, **copy.deepcopy(addition)}}
        self.assertEqual(merge_rules(existing, addition), existing)

    def test_preserves_existing_rules(self):
        existing={'rules':{'cybrview':{'v1':{'projects':{'.read':'auth != null'}}}}}
        original=copy.deepcopy(existing)
        addition={'kiruBilling':{'v1':{'users':{}}}}
        merged=merge_rules(existing,addition)
        self.assertEqual(merged['rules']['cybrview'],existing['rules']['cybrview'])
        self.assertEqual(existing,original)
        self.assertEqual(merge_rules(merged,addition),merged)
    def test_rejects_global_access(self):
        for rule in (True,'auth != null'):
            with self.assertRaises(SetupError):
                merge_rules({'rules':{'.read':rule}},{'kiruBilling':{}})
    def test_refuses_overwriting_different_billing_rules(self):
        with self.assertRaises(SetupError):
            merge_rules({'rules':{'kiruBilling':{'.read':True}}},{'kiruBilling':{}})
    def test_comments_and_strings(self):
        result=parse_rules('{/* comment */"rules":{"cybrview":{".read":"auth != null // not a comment"}} // end\n}')
        self.assertEqual(result['rules']['cybrview']['.read'],'auth != null // not a comment')
    def test_rejects_unexpected_rules(self):
        with self.assertRaises(SetupError):
            parse_rules('{}')

if __name__=='__main__':
    unittest.main()
