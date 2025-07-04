glide.keymaps.set("normal", "0", () => {
  console.log("woooo");

  debugger;
  glide.unstable.include("glide.ts");
});

const M = {};

M.foo = function foo() {
  console.log("wooo");
};

M;

// function foo() {
//   //
// }

// return { foo };
