#ifndef glide_h__
#define glide_h__

#include <cstdint>
#include "mozilla/EnumTypeTraits.h"
#include "mozilla/StaticPrefsBase.h"

namespace mozilla {
namespace glide {
enum class GlideMode : uint32_t {
  Normal = 0,
  Insert = 1,
  Visual = 2,
  OpPending = 3,
  Ignore = 4,
  Hint = 5,
  Command = 6,
  Other = 7,
};

/**
 * Determines if the caret should render a block over the entirety of the
 * selected char. Also known as a "fat caret".
 *
 * e.g. with the caret on `b` in `foo bar` -> `foo █ar`
 *
 * Note: this takes an integer instead of `GlideMode` because the calling code
 *       only gets access to the integer version through the pref callback.
 */
__attribute__((used)) static bool shouldRenderBlockCaret(
    StripAtomic<RelaxedAtomicInt32> mode) {
  switch (mode) {
    case UnderlyingValue(GlideMode::Ignore):
    case UnderlyingValue(GlideMode::Command):
    case UnderlyingValue(GlideMode::Insert): {
      return false;
    }

    // note: operator pending mode uses the underline caret style
    case UnderlyingValue(GlideMode::OpPending): {
      return false;
    }

    // note: visual mode hits a different code path for drawing the selection
    // that currently doesn't take the caret into effect, so this value
    // doesn't matter.
    case UnderlyingValue(GlideMode::Hint):
    case UnderlyingValue(GlideMode::Visual):
    case UnderlyingValue(GlideMode::Other):
    case UnderlyingValue(GlideMode::Normal): {
      return true;
    }
    default:
      MOZ_ASSERT_UNREACHABLE("Unexpected glide mode enum value");
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
 * Note: this takes an integer instead of `GlideMode` because the calling code
 *       only gets access to the integer version through the pref callback.
 */
__attribute__((used)) static bool shouldRenderUnderlineCaret(
    StripAtomic<RelaxedAtomicInt32> mode) {
  switch (mode) {
    case UnderlyingValue(GlideMode::OpPending): {
      return true;
    }

    case UnderlyingValue(GlideMode::Hint):
    case UnderlyingValue(GlideMode::Visual):
    case UnderlyingValue(GlideMode::Ignore):
    case UnderlyingValue(GlideMode::Normal):
    case UnderlyingValue(GlideMode::Command):
    case UnderlyingValue(GlideMode::Other):
    case UnderlyingValue(GlideMode::Insert): {
      return false;
    }

    default:
      MOZ_ASSERT_UNREACHABLE("Unexpected glide mode enum value");
      return false;
  }
}
}  // namespace glide
}  // namespace mozilla

#endif  // glide_h__
