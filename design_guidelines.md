# Employee Management System (EMS) Design Guidelines
## Nano Flows AI Technologies Pvt. Ltd.

### Design Approach
**Design System: Material Design 3 (Customized)**
Rationale: Enterprise management system requiring data-dense displays, complex forms, and role-based interfaces. Material Design provides robust patterns for dashboards, tables, and information hierarchy while allowing brand customization.

### Core Design Principles
1. **Data Clarity**: Information-first design with clear visual hierarchy
2. **Efficient Workflows**: Minimize clicks, maximize task completion speed
3. **Trust & Professionalism**: Enterprise-grade aesthetics with Nano Flows branding
4. **Responsive Intelligence**: Seamless experience across web and mobile devices

---

## Color Palette

### Brand Colors (From Nano Flows AI Logo)
- **Primary Blue**: 210 100% 50% (vibrant blue from logo)
- **Cyan Accent**: 190 80% 55% (cyan highlight)
- **Gradient Background**: Linear gradient from Primary Blue to Cyan (135deg)

### System Colors
**Light Mode:**
- Background: 210 20% 98%
- Surface: 0 0% 100%
- Text Primary: 210 15% 15%
- Text Secondary: 210 10% 45%
- Border: 210 15% 85%

**Dark Mode:**
- Background: 210 25% 8%
- Surface: 210 20% 12%
- Text Primary: 210 10% 95%
- Text Secondary: 210 10% 65%
- Border: 210 15% 25%

### Status Colors
- Success: 142 70% 45%
- Warning: 38 92% 50%
- Error: 0 84% 60%
- Info: 210 100% 50%

---

## Typography

### Font Families
- **Primary (UI)**: Inter (Google Fonts) - weights: 400, 500, 600, 700
- **Display (Headers)**: Space Grotesk (Google Fonts) - weights: 500, 700
- **Monospace (Data)**: JetBrains Mono - weight: 400

### Type Scale
- **Display**: text-4xl (36px) / Space Grotesk Bold
- **H1**: text-3xl (30px) / Space Grotesk Medium
- **H2**: text-2xl (24px) / Inter Semibold
- **H3**: text-xl (20px) / Inter Semibold
- **Body**: text-base (16px) / Inter Regular
- **Small**: text-sm (14px) / Inter Regular
- **Caption**: text-xs (12px) / Inter Medium

---

## Layout System

### Spacing Primitives
Use Tailwind units: **2, 4, 6, 8, 12, 16, 24** for consistent rhythm
- Micro spacing (within components): 2, 4
- Component spacing: 6, 8
- Section spacing: 12, 16, 24

### Grid Structure
- **Desktop**: 12-column grid, max-w-7xl container
- **Tablet**: 8-column grid, max-w-4xl
- **Mobile**: 4-column stack, max-w-sm

### Dashboard Layout
- **Sidebar**: Fixed 280px width on desktop, collapsible drawer on mobile
- **Main Content**: Flexible with 6-8 spacing padding
- **Cards**: Rounded-xl with shadow-md elevation

---

## Component Library

### Navigation
**Top Bar:**
- Height: 64px fixed
- Nano Flows AI logo (left, 40px height)
- User profile dropdown (right)
- Gradient background (Primary to Cyan)
- Glass morphism effect on scroll

**Sidebar (Admin/Employee):**
- Dark surface background
- Icon + label navigation items
- Active state: cyan accent left border + background tint
- Collapsible sections for modules

### Dashboards
**Card Components:**
- White/Dark surface with rounded-xl
- Shadow-md elevation
- 6 padding, 4 gap between elements
- Header with icon + title (text-lg semibold)

**Stat Cards:**
- Grid layout (2-4 columns responsive)
- Large number display (text-3xl bold)
- Icon in cyan accent color
- Subtle gradient background option

**Data Tables:**
- Striped rows (subtle background alternation)
- Fixed header on scroll
- Action buttons (icon-only) in last column
- Pagination controls at bottom

### Forms & Inputs
**Input Fields:**
- Height: 44px (touch-friendly)
- Border: 1px solid border color
- Focus: 2px cyan ring
- Label above (text-sm semibold)
- Error state: red border + helper text below

**Buttons:**
- **Primary**: Gradient (blue to cyan), white text, rounded-lg, px-6 py-3
- **Secondary**: Outline cyan, rounded-lg, px-6 py-3
- **Danger**: Solid red background
- **Ghost**: Text only with hover background

**Select/Dropdowns:**
- Same styling as inputs
- Chevron down icon (right)
- Dropdown menu: rounded-lg, shadow-lg

### Authentication Pages
**Login/Sign Up:**
- Split screen (50/50 on desktop)
- Left: Gradient background with Nano Flows logo and tagline
- Right: White form container, centered, max-w-md
- Futuristic illustration/abstract shapes on gradient side

**Splash Screen:**
- Full viewport
- Centered Nano Flows logo (animated fade-in)
- Gradient background (animated)
- Loading spinner below logo

### Attendance System
**Check-in/Check-out Card:**
- Large centered button (primary gradient)
- Display: current time, date, location
- Status indicator (checked-in: green dot)
- Recent activity timeline below

### Leave Management
**Application Form:**
- Date range picker (calendar UI)
- Leave type dropdown
- Reason textarea
- Submit button (primary)

**Approval Interface (Admin):**
- Card-based queue
- Employee info (avatar + name)
- Leave details summary
- Approve (green) / Reject (red) buttons side-by-side
- Remarks textarea on reject

### Salary & Travel
**Payslip View:**
- Professional invoice-style layout
- Company header (logo + details)
- Earnings vs Deductions table
- Net salary highlighted (large, bold)
- Download PDF button

**Travel Bill Submission:**
- Multi-file upload zone (drag-and-drop)
- Amount input + description
- Date picker
- Category dropdown
- Receipt preview thumbnails

### Notifications
**Notification Center:**
- Dropdown from top bar (bell icon)
- List of cards (unread: cyan accent border)
- Icon-based types (info, success, warning)
- Mark as read action
- View all link at bottom

---

## Animations
Use sparingly for purposeful feedback:
- Page transitions: 200ms ease-in-out
- Button hover: scale(1.02) with 150ms
- Card hover: shadow-lg transition 200ms
- Loading states: spinner or skeleton screens
- No scroll animations or parallax

---

## Images
**Logo Placement:**
- Header: Nano Flows AI logo (40px height, left-aligned)
- Splash Screen: Large centered logo (120px height)
- Login Page: Medium logo on gradient side (80px height)

**Dashboard Backgrounds:**
- Subtle gradient overlays on card backgrounds
- Abstract geometric patterns (low opacity) for empty states
- No hero images (utility-focused app)

**Employee Photos:**
- Circular avatars (40px default, 80px in profile)
- Placeholder: initials on gradient background
- Admin can upload/update photos

---

## Responsive Breakpoints
- **Mobile**: < 640px (stack all, full-width cards, bottom nav)
- **Tablet**: 640-1024px (2-column grids, sidebar drawer)
- **Desktop**: > 1024px (multi-column, fixed sidebar)

---

## Role-Based UI Variations
**Admin Dashboard:**
- Full sidebar with all modules
- Overview cards: total employees, pending approvals, monthly salary
- Quick action buttons: Broadcast email, Approve leaves batch

**Employee Dashboard:**
- Simplified sidebar (attendance, leaves, salary, profile)
- Activity log prominent (daily updates)
- Quick actions: Check-in, Apply leave, Submit travel bill

**HR Role:**
- Attendance + Leave management focus
- Employee biodata editing access
- Limited salary view (no processing)