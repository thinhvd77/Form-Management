# Layout System Documentation

This document describes the layout system components available in the Form Review application.

## Components Overview

### 1. Layout Component
The main layout wrapper that provides the basic structure for all pages.

**Features:**
- Sticky header with navigation
- Responsive design
- Footer
- Consistent spacing and styling

**Usage:**
```jsx
import { Layout } from './components';

function App() {
  return (
    <Layout>
      {/* Your page content here */}
    </Layout>
  );
}
```

### 2. PageHeader Component
A flexible header component for individual pages that provides titles, breadcrumbs, and action buttons.

**Features:**
- Automatic breadcrumb generation
- Custom page titles
- Action buttons area
- Responsive design

**Usage:**
```jsx
import { PageHeader } from '../../components';

function MyPage() {
  return (
    <div>
      <PageHeader 
        title="My Page Title"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Section', path: '/section' },
          { label: 'Current Page', path: '/section/current', isActive: true }
        ]}
        actions={
          <div>
            <button className="btn btn-primary">Action Button</button>
          </div>
        }
      />
      {/* Rest of your page content */}
    </div>
  );
}
```

**Props:**
- `title` (string): The page title
- `breadcrumbs` (array): Custom breadcrumb items (optional - auto-generated if not provided)
- `actions` (ReactNode): Action buttons or other elements to display in the header

### 3. Container Component
A responsive container component for consistent content width and padding.

**Features:**
- Multiple width variants (small, medium, default, large, full)
- Multiple padding variants (none, small, default, large)
- Responsive behavior
- Customizable HTML element

**Usage:**
```jsx
import { Container } from '../../components';

function MyComponent() {
  return (
    <Container maxWidth="large" padding="default">
      {/* Your content here */}
    </Container>
  );
}
```

**Props:**
- `maxWidth` (string): 'small' | 'medium' | 'default' | 'large' | 'full'
- `padding` (string): 'none' | 'small' | 'default' | 'large'
- `className` (string): Additional CSS classes
- `as` (string): HTML element to render (default: 'div')

## File Structure

```
src/
├── components/
│   ├── index.js                 # Main components export
│   ├── Layout/
│   │   ├── index.js
│   │   ├── Layout.jsx
│   │   └── Layout.css
│   ├── PageHeader/
│   │   ├── index.js
│   │   ├── PageHeader.jsx
│   │   └── PageHeader.css
│   └── Container/
│       ├── index.js
│       ├── Container.jsx
│       └── Container.css
```

## Implementation Example

Here's how the SelectionPage has been updated to use the new layout system:

```jsx
import React from 'react';
import { PageHeader } from '../../components';

const SelectionPage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Biểu Mẫu Tự Đánh Giá Mức Độ Hoàn Thành Công Việc"
        actions={
          <div className="page-actions">
            <button type="button" className="btn btn-outline">
              Hướng dẫn
            </button>
          </div>
        }
      />
      
      {/* Rest of your page content */}
    </div>
  );
};
```

## CSS Classes Available

The layout system provides several utility CSS classes:

### Layout Classes
- `.layout` - Main layout container
- `.layout-header` - Header section
- `.layout-main` - Main content area
- `.layout-footer` - Footer section

### Navigation Classes
- `.nav-link` - Navigation links
- `.nav-link.active` - Active navigation state

### Container Classes
- `.container` - Base container
- `.container-small` - Small width container
- `.container-medium` - Medium width container
- `.container-default` - Default width container
- `.container-large` - Large width container
- `.container-full` - Full width container

### PageHeader Classes
- `.page-header` - Header container
- `.page-title` - Page title styling
- `.breadcrumbs` - Breadcrumb navigation
- `.breadcrumb-link` - Breadcrumb links
- `.breadcrumb-current` - Current page breadcrumb

## Responsive Behavior

All components are designed to be responsive and work well on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (480px - 767px)
- Small Mobile (< 480px)

The layout automatically adjusts spacing, typography, and navigation structure for different screen sizes.

## Best Practices

1. **Always use the Layout component** as the root wrapper for your application
2. **Use PageHeader** for consistent page titles and navigation
3. **Use Container** for consistent content width and spacing
4. **Import components** from the main components index for cleaner imports
5. **Follow the established naming conventions** for CSS classes
6. **Test responsive behavior** on different screen sizes

## Future Enhancements

Potential improvements to consider:
- Theme support (dark/light mode)
- Additional container sizes
- More navigation patterns
- Loading states for PageHeader
- SEO meta tag integration
