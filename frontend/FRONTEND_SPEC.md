# FRONTEND_SPEC

## General Principles
- All React components must follow SOLID principles.
- Each component must reside in its own folder (e.g. `src/components/ComponentName`).
- Use Tailwind CSS for all styling.
- Use Shard CDN for additional UI elements if needed.
- All code must be modular, reusable, and easy to extend.
- Use React Context for shared state (e.g. TopBar, Sidebar).
- Use React Router (HashRouter) for navigation.
- Sidebar, TopBar, and ContentArea must be fully responsive.
- Sidebar must support toggling, resizing, and compact mode.
- TopBar must support dynamic title and injected components via context.
- All icons must be SVG and visually modern.
- All menu links must use React Router navigation.
- All code must be robust and tested for edge cases.

## Code Snippet Policy
- **If any code snippet is provided, always provide the full code of the file, not just a partial snippet.**
- This ensures clarity, prevents confusion, and makes copy-paste integration easy.
- All code examples must be ready to use and include all necessary imports and exports.

## Translation Policy
- **Translations will only be used when adding text to the frontend.**
- **Every text added will be translated for all available languages (currently: English, German, Italian).**
- All translation keys must exist in every language file.
- Use react-i18next for all translation logic.

## Folder Structure Example
```
src/components/Sidebar/
src/components/TopBar/
src/components/Menu/
src/components/Layout/
src/components/ContentArea/
src/locales/en/translation.json
src/locales/de/translation.json
src/locales/it/translation.json
```

## Responsiveness
- All components must use Tailwind's responsive classes.
- Sidebar overlays on mobile, is fixed on desktop.
- TopBar is sticky and always visible.
- ContentArea is scrollable and centered.

## Context Usage
- Use TopBarContext for dynamic title and injected components.
- Use SidebarContext if shared sidebar state is needed.

## Routing
- Use HashRouter for all navigation.
- All menu items must use `<NavLink>` for navigation and active highlighting.

## Icon Policy
- Use SVG icons only.
- All icons must be visually modern and accessible.

## Testing
- All code must be tested for errors after every change.
- Edge cases and responsiveness must be verified.

## Example
If you request a code change or feature, you will always receive the full code of the affected file, not just a snippet.

- Im gesamten Frontend-Code werden niemals Kommentare hinzugefügt.
