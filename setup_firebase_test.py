import copy
import unittest
from setup_firebase import merge_rules, parse_rules, SetupError

class RulesTests(unittest.TestCase):
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
