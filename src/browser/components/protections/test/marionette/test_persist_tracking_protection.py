# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait
from marionette_harness import MarionetteTestCase


ABOUT_PREFERENCES_PRIVACY = "about:preferences#privacy"
CAT_PREF = "browser.contentblocking.category"


class TestPersistTrackingProtection(MarionetteTestCase):
    def setUp(self):
        super().setUp()
        self._open_privacy_pane()
        self._set_category_via_ui("standard")

    def tearDown(self):
        try:
            self._open_privacy_pane()
            self._set_category_via_ui("standard")
        finally:
            super().tearDown()

    def _open_privacy_pane(self):
        self.marionette.navigate(ABOUT_PREFERENCES_PRIVACY)
        Wait(self.marionette, timeout=30).until(
            lambda m: m.find_element(By.ID, "standardRadio")
            and m.find_element(By.ID, "strictRadio"),
            message="Waiting for ETP category radios on about:preferences#privacy",
        )

    def _click_and_wait_pref(self, element_id, expected_value):
        el = self.marionette.find_element(By.ID, element_id)
        el.click()
        Wait(self.marionette, timeout=30).until(
            lambda _: self.marionette.get_pref(CAT_PREF) == expected_value,
            message=f"Waiting for {CAT_PREF} to become {expected_value!r}",
        )

    def _radio_selected(self, element_id):
        el = self.marionette.find_element(By.ID, element_id)
        return self.marionette.execute_script(
            "return arguments[0].selected === true;", script_args=[el]
        )

    def _set_category_via_ui(self, category):
        if category not in ("standard", "strict"):
            raise ValueError(f"Unsupported ETP category: {category}")

        current = self.marionette.get_pref(CAT_PREF)
        if current == category:
            return

        if category == "standard":
            self._click_and_wait_pref("standardRadio", "standard")
        else:
            self._click_and_wait_pref("strictRadio", "strict")

        Wait(self.marionette, timeout=30).until(
            lambda _: self._radio_selected(f"{category}Radio"),
            message=f"Waiting for {category} radio to be selected",
        )

    def test_standard_to_strict_persists_after_restart(self):
        self._open_privacy_pane()

        self._set_category_via_ui("strict")
        self.assertEqual(self.marionette.get_pref(CAT_PREF), "strict")
        self.assertTrue(self._radio_selected("strictRadio"))

        self.marionette.restart(in_app=True)

        self._open_privacy_pane()
        self.assertEqual(self.marionette.get_pref(CAT_PREF), "strict")
        self.assertTrue(self._radio_selected("strictRadio"))
        self.assertFalse(self._radio_selected("standardRadio"))
