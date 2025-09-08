main();

async function main() {
  const response = await fetch("https://product-details.mozilla.org/1.0/firefox_versions.json");
  console.table(await response.json());
}
