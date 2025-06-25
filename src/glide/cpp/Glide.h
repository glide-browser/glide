#ifndef glide_h__
#define glide_h__

#include <cstdint>
#include "mozilla/EnumTypeTraits.h"
#include "mozilla/StaticPrefsBase.h"

namespace mozilla {
namespace glide {
enum class GlideCaretStyle : uint32_t {
  Block = 0,
  Underline = 1,
  Line = 2,
};

/**
 * Determines if the caret should render a block over the entirety of the
 * selected char. Also known as a "fat caret".
 *
 * e.g. with the caret on `b` in `foo bar` -> `foo █ar`
 *
 * Note: this takes an integer instead of `GlideCaretStyle` because the calling code
 *       only gets access to the integer version through the pref callback.
 */
__attribute__((used)) static bool shouldRenderBlockCaret(
    StripAtomic<RelaxedAtomicInt32> style) {
  switch (style) {
    case UnderlyingValue(GlideCaretStyle::Block): {
      return true;
    }
    case UnderlyingValue(GlideCaretStyle::Line):
    case UnderlyingValue(GlideCaretStyle::Underline): {
      return false;
    }
    default:
      MOZ_ASSERT_UNREACHABLE("Unexpected glide caret style enum value");
      return false;
  }
}

/**
 * Determines if the caret should render like an underscore beneath the selected
 * char.
 *
 * e.g. with the caret on `b` -> `foo bar`
 *                                    ̅
 * (this example might not render in the correct position depending on your
 * font)
 *
 * Note: this takes an integer instead of `GlideCaretStyle` because the calling code
 *       only gets access to the integer version through the pref callback.
 */
__attribute__((used)) static bool shouldRenderUnderlineCaret(
    StripAtomic<RelaxedAtomicInt32> style) {
  switch (style) {
    case UnderlyingValue(GlideCaretStyle::Underline): {
      return true;
    }
    case UnderlyingValue(GlideCaretStyle::Line):
    case UnderlyingValue(GlideCaretStyle::Block): {
      return false;
    }

    default:
      MOZ_ASSERT_UNREACHABLE("Unexpected glide caret style enum value");
      return false;
  }
}
}  // namespace glide
}  // namespace mozilla

#endif  // glide_h__
