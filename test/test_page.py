#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import unittest

from selenium import webdriver


class NewVisitorTest(unittest.TestCase):
    def setUp(self):
        self.browser = webdriver.Chrome()

    def tearDown(self):
        self.browser.quit()

    def test_title(self):
        self.browser.get('http://localhost:5001')
        self.assertIn('Token', self.browser.title)


if __name__ == '__main__':
    unittest.main(warnings='ignore')
