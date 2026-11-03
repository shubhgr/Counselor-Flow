# Counselor design system

- `tokens.css` is the source of truth for the 70 supplied Figma colors and the 14 spacing, 8 radius and 5 stroke values. Radius names are normalized to sequential indices; values match Figma exactly.
- Text uses locally bundled Inter. Icons use Lucide SVG components; there is no icon font or remote icon request.
- `src/components/ui/` contains official shadcn registry sources installed by the CLI. `registry.json` records their upstream SHA-256 hashes and the intentional Figma adaptations. These are editable source components, not a black-box component package.
- `workspace.css`, `responsive.css` and `person.css` hold shared product layout/recipe rules. `src/app/globals.css` maps the Figma tokens into shadcn's Tailwind semantic theme.
- `icons.json` maps product icon names to Lucide icons. `scripts/build-icons.mjs` generates SVG markup for workflow-created controls from the same library. React views use `Icon` or the direct Lucide imports included in the official shadcn components.
- `/design-system` is the interactive component and token catalog.

All shared primitives start from shadcn. Product layouts, charts, brand assets and specialized media/upload workflows are composed around those primitives. Use existing tokens before adding values; preserve labels, errors, disabled states and keyboard focus.
