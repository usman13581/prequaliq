# Assets Folder

This folder contains static assets like logos, images, icons, etc.

## Structure

- `logos/` - Logo files (PNG, SVG, JPG, etc.)

## Usage

### Importing logos in components:

```tsx
// Using path alias (recommended)
import logo from '@/assets/logos/logo.png';
import logoIcon from '@/assets/logos/icon.svg';

// Or relative path
import logo from '../assets/logos/logo.png';
```

### Using in JSX:

```tsx
<img src={logo} alt="PrequaliQ Logo" />
```

## Public Folder

For truly static files that should be served at the root URL, use the `public/` folder:
- Files in `public/` are available at `/filename.ext`
- Example: `public/favicon.ico` → `/favicon.ico`
- Use for files that don't need to be imported in code
