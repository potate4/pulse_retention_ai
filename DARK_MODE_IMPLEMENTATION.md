# Dark Mode Implementation Guide

## Overview
This document describes the dark mode theme system implemented in the Pulse application using a custom color palette.

## Color Palette
The application uses a custom color palette defined in `tailwind.config.js`:

### Primary Colors
- **Teal** (#7AACB3): Main brand color, used for primary actions and highlights
- **Slate** (#4D6E81): Secondary brand color, used for hover states and secondary actions
- **Magenta** (#CF0DA8): Accent color, used for important actions and alerts
- **Mauve** (#AA5376): Supporting accent color
- **Navy** (#3B3758): Dark accent color, used as border color in dark mode

### Light Mode Colors
- **Background**: #F9FAFB (light gray)
- **Surface**: #FFFFFF (white)
- **Border**: #E5E7EB (light gray border)
- **Text Primary**: #111827 (dark gray/black)
- **Text Secondary**: #6B7280 (medium gray)
- **Text Muted**: #9CA3AF (light gray)

### Dark Mode Colors
- **Background**: #1a1625 (deep purple-black)
- **Surface**: #2a2438 (dark purple)
- **Border**: #3B3758 (navy - matching palette)
- **Text Primary**: #E5E7EB (light gray)
- **Text Secondary**: #9CA3AF (medium gray)
- **Text Muted**: #6B7280 (darker gray)

## Implementation Details

### 1. Theme Management
**File**: `frontend/src/stores/themeStore.js`

Uses Zustand for state management with localStorage persistence:
```javascript
- isDarkMode: boolean state
- toggleTheme(): switches between light/dark mode
- initializeTheme(): applies saved theme on app load
```

### 2. Theme Toggle Component
**File**: `frontend/src/components/ThemeToggle.jsx`

Fixed position button (top-right) with sun/moon icons that:
- Displays current theme state
- Toggles theme on click
- Styled with custom teal color

### 3. Tailwind Configuration
**File**: `frontend/tailwind.config.js`

- `darkMode: 'class'` - enables class-based dark mode
- Custom color extensions added to theme
- All custom colors accessible via utility classes

### 4. Usage Pattern

All components follow this pattern:
```jsx
className="bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
```

**Utility Classes:**
- Backgrounds: `bg-light-bg dark:bg-dark-bg`
- Surfaces: `bg-light-surface dark:bg-dark-surface`
- Borders: `border-light-border dark:border-dark-border`
- Text: `text-light-text-primary dark:text-dark-text-primary`
- Primary actions: `bg-primary-teal hover:bg-primary-slate`
- Danger actions: `bg-primary-magenta hover:bg-primary-mauve`

## Updated Files

### Pages (6 files)
1. `Landing.jsx` - Hero section, feature cards
2. `Login.jsx` - Authentication form
3. `Signup.jsx` - Registration form
4. `Home.jsx` - Dashboard with user info and quick actions
5. `EmailCampaign.jsx` - Email campaign interface
6. `EditTemplate.jsx` - Template editing page

### Components (8 files)
1. `ThemeToggle.jsx` - NEW: Theme switcher button
2. `Button.jsx` - Button variants with dark mode
3. `Input.jsx` - Form inputs with dark mode
4. `Loading.jsx` - Loading spinner
5. `EmailPreviewCard.jsx` - Email preview display
6. `CustomerTable.jsx` - Customer data table
7. `SegmentSelector.jsx` - Segment dropdown
8. `TemplateEditor.jsx` - Rich template editor

### Configuration & State (3 files)
1. `tailwind.config.js` - Theme configuration
2. `themeStore.js` - NEW: Theme state management
3. `App.jsx` - Theme initialization

## Features

### Automatic Theme Persistence
- Theme preference saved to localStorage
- Restored on page reload
- Consistent across browser sessions

### Component Styling
- All interactive elements support both modes
- Proper contrast ratios maintained
- Custom color palette applied consistently
- Hover states adapted for both themes

### Future Features
When creating new components or pages:

1. **Always use the theme-aware classes:**
   ```jsx
   // Background
   bg-light-bg dark:bg-dark-bg
   
   // Surface (cards, modals)
   bg-light-surface dark:bg-dark-surface
   
   // Borders
   border border-light-border dark:border-dark-border
   
   // Text
   text-light-text-primary dark:text-dark-text-primary
   text-light-text-secondary dark:text-dark-text-secondary
   ```

2. **Use custom brand colors for actions:**
   ```jsx
   // Primary buttons
   bg-primary-teal hover:bg-primary-slate
   
   // Important actions
   bg-primary-magenta hover:bg-primary-mauve
   
   // Links and highlights
   text-primary-teal hover:text-primary-slate
   ```

3. **Test both themes:**
   - Check color contrast
   - Verify readability
   - Ensure hover states are visible
   - Test with different screen sizes

## Browser Support
- Modern browsers supporting CSS custom properties
- Tailwind CSS dark mode class strategy
- localStorage API for persistence

## Accessibility
- Sufficient color contrast in both modes
- Focus states maintained
- ARIA labels on theme toggle
- Keyboard navigation supported

## Testing Checklist
- [ ] Theme toggle works on all pages
- [ ] Theme persists across page refreshes
- [ ] All text is readable in both modes
- [ ] Buttons and links have proper hover states
- [ ] Forms maintain proper contrast
- [ ] Tables and cards display correctly
- [ ] Icons and graphics adapt to theme

## Troubleshooting

**Theme not persisting:**
- Check browser localStorage is enabled
- Verify themeStore initialization in App.jsx

**Colors not applying:**
- Ensure Tailwind dark mode is set to 'class'
- Check `dark` class is added to `<html>` element
- Verify custom colors are defined in tailwind.config.js

**Contrast issues:**
- Review text color classes
- Check background/foreground color combinations
- Test with accessibility tools

## Maintenance Notes
- Custom color values defined once in tailwind.config.js
- All components use semantic class names
- Easy to update color scheme by modifying config
- Consistent naming convention for theme classes
