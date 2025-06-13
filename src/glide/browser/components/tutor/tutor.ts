declare var document: Document;

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.body!.focus();
  }, 1000);

  // replace all `<highlight>` elements with the fake shiki highlight'd version
  const template = document.getElementById(
    "highlight-template"
  ) as HTMLTemplateElement;
  document.querySelectorAll("highlight").forEach(element => {
    const fragment = template.content.cloneNode(true) as HTMLElement;
    fragment.querySelector("span span")!.textContent = element.textContent;
    element.replaceWith(fragment);
  });
});
