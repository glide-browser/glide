type Glide = typeof glide;
type Browser = typeof browser;

export function pretty(glide: Glide, browser: Browser): void {
  browser.webNavigation.onCompleted.addListener(
    async details => {
      await glide.content.execute(
        () => {
          const PROXIMITY_PX = 180; // start running when cursor is this close
          const MOVE_STEP_PX = 300; // how far it jumps each time

          const button = document!.querySelector(
            "#js-download-hero"
          ) as HTMLElement | null;
          if (!button) throw new Error("Could not find download button");

          // Leave layout alone until we actually need to move.
          button.style.position = "relative";
          button.style.transition = "transform 100ms ease-out";
          button.style.zIndex = "100";

          let moves = 0;
          let rotation = 0;
          let enabled = false;
          setTimeout(() => (enabled = true), 120);

          /** Repositions the button away from the cursor, bouncing off edges. */
          const dodge = (e: MouseEvent) => {
            // limit the number of moves to ensure it isn't just completely annoying
            if (moves >= 10) return;
            if (!enabled) return;
            enabled = false;
            setTimeout(() => (enabled = true), 40);

            const rect = button.getBoundingClientRect();
            const centre = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            };
            const dx = e.clientX - centre.x;
            const dy = e.clientY - centre.y;
            const dist = Math.hypot(dx, dy);

            if (dist > PROXIMITY_PX) return; // cursor still far away — do nothing

            const angle = Math.atan2(-dy, -dx);
            let offset_x =
              Math.cos(0.2 * (Math.random() - 0.5) + angle) * MOVE_STEP_PX;
            let offset_y =
              Math.sin(0.2 * (Math.random() - 0.5) + angle) * MOVE_STEP_PX;

            rotation = rotation + (Math.random() - 0.5) * 120;
            button.style.transform = `translate(${offset_x}px, ${offset_y}px) rotate(${rotation}deg)`;

            moves += 1;
          };

          document!.addEventListener("mousemove", dodge, { passive: true });
        },
        { tab_id: details.tabId }
      );
    },
    { url: [{ hostEquals: "www.google.com", pathContains: "chrome" }] }
  );
}
