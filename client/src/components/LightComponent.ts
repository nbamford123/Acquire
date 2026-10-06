import { type CSSResultGroup, LitElement, unsafeCSS } from 'lit';

const added = new Set<string>();

const cssText = (styles: CSSResultGroup | undefined): string =>
  !styles
    ? ''
    : Array.isArray(styles)
    ? styles.map(cssText).join('\n')
    : 'cssText' in styles
    ? styles.cssText
    : unsafeCSS(styles).cssText;

// Renders into the element itself instead of a shadow root, so the page's Pico stylesheet and theme
// apply. A component's static styles are added to the page once, nested under its tag so they only
// match inside it; in them, & is the component's own element.
export class LightComponent extends LitElement {
  protected override createRenderRoot() {
    return this;
  }

  public override connectedCallback() {
    super.connectedCallback();
    const tag = this.localName;
    if (added.has(tag)) return;
    added.add(tag);
    const style = document.createElement('style');
    style.dataset.component = tag;
    style.textContent = `${tag} {\n${cssText((this.constructor as typeof LitElement).styles)}\n}`;
    document.head.append(style);
  }
}
