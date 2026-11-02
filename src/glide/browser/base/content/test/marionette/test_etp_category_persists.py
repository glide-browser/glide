# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait
from marionette_harness import MarionetteTestCase

CATEGORY_PREF = "browser.contentblocking.category"

# this pref is enabled by the strict ETP category, and disabled under standard ETP
TRACKING_PROTECTION_PREF = "privacy.trackingprotection.enabled"


class TestETPCategoryPersists(MarionetteTestCase):
    """See https://github.com/glide-browser/glide/issues/96"""

    def open_etp_settings(self):
        self.marionette.navigate("about:preferences#etp")
        Wait(self.marionette, timeout=30).until(
            lambda m: m.find_element(By.ID, "etpLevelStrict"),
            message="ETP level radios should render",
        )

    def radio(self, category):
        return self.marionette.find_element(By.ID, f"etpLevel{category.title()}")

    def select_category(self, category):
        # click the radio's own <input>, the `moz-radio` host also contains its
        # nested options (e.g. strict's exception checkboxes)
        input_el = self.marionette.execute_script(
            "return arguments[0].inputEl;", script_args=[self.radio(category)]
        )
        input_el.click()
        Wait(self.marionette).until(
            lambda m: m.get_pref(CATEGORY_PREF) == category,
            message=f"{CATEGORY_PREF} should change to {category}",
        )

    def test_strict_persists_across_restart(self):
        self.assertEqual(
            self.marionette.get_pref(CATEGORY_PREF, default_branch=True),
            "strict",
            "this test relies on strict being the default category",
        )

        self.open_etp_settings()
        self.select_category("standard")
        self.assertFalse(self.marionette.get_pref(TRACKING_PROTECTION_PREF))

        self.select_category("strict")
        self.assertTrue(
            self.marionette.get_pref(TRACKING_PROTECTION_PREF),
            "selecting strict should apply its prefs",
        )

        self.marionette.restart(in_app=True)

        self.assertEqual(self.marionette.get_pref(CATEGORY_PREF), "strict")
        self.assertTrue(
            self.marionette.get_pref(TRACKING_PROTECTION_PREF),
            "strict prefs should still be applied after a restart",
        )

        self.open_etp_settings()
        self.assertTrue(self.radio("strict").get_property("checked"))
        self.assertFalse(self.radio("standard").get_property("checked"))
