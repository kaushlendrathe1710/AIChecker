# Design Guidelines: Plagiarism Checker Platform

## Design Approach

**Reference-Based with System Foundation**: Draw inspiration from modern academic and productivity tools like Notion, Linear, and Grammarly while maintaining the professional credibility of academic platforms. The goal is to dramatically improve upon Turnitin's outdated interface with clean, modern design patterns that prioritize clarity and efficiency.

**Core Design Principles**:
- **Clarity Over Decoration**: Every visual element serves a functional purpose
- **Trust Through Professionalism**: Academic credibility via clean, consistent design
- **Scannable Information**: Dense data presented in digestible, hierarchical chunks
- **Responsive Efficiency**: Mobile-friendly without compromising desktop power-user workflows

## Typography

**Font Families**:
- **Primary**: Inter (Google Fonts) - for UI elements, body text, and data
- **Accent**: JetBrains Mono - for code snippets, document IDs, technical details

**Type Scale**:
- Hero/Page Titles: text-4xl font-bold (36px)
- Section Headers: text-2xl font-semibold (24px)
- Card Titles: text-lg font-medium (18px)
- Body Text: text-base (16px)
- Secondary/Meta: text-sm (14px)
- Labels/Captions: text-xs font-medium uppercase tracking-wide (12px)

**Hierarchy Application**:
- Dashboard titles: Large, bold, clear page context
- Report sections: Medium weight headers with subtle spacing
- Data labels: Uppercase, tracked, subdued
- Body content: Comfortable reading size with 1.6 line-height

## Layout System

**Spacing Primitives**: Use Tailwind units of 4, 6, 8, 12, 16, 20, 24 (e.g., p-4, gap-8, mb-12)

**Container Strategy**:
- Full-width layouts: max-w-7xl mx-auto for main content areas
- Sidebar layouts: Fixed 280px sidebar + flex-1 main content
- Report viewer: max-w-4xl for optimal document reading width
- Dashboards: max-w-full with internal grid constraints

**Grid Patterns**:
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Stats overview: grid-cols-2 md:grid-cols-4 gap-4
- Document list: Single column with row-based cards
- Comparison view: grid-cols-1 lg:grid-cols-2 gap-8 (side-by-side)

**Responsive Breakpoints**:
- Mobile: Stack all multi-column layouts, expand sidebar to overlay
- Tablet: 2-column grids, collapsible sidebar
- Desktop: Full multi-column layouts, persistent sidebar navigation

## Component Library

### Navigation & Structure

**Top Navigation Bar**:
- Fixed header with subtle shadow (h-16)
- Logo left, user menu/notifications right
- Breadcrumb navigation for deep pages
- Clean, minimal design with high contrast

**Sidebar Navigation** (Dashboard):
- 280px fixed width, full-height
- Icon + label navigation items with hover states
- Active state: Subtle background with accent border-left
- Collapsible on mobile (overlay with backdrop)
- Bottom section for user profile/settings

### Authentication Flow

**OTP Login Screen**:
- Centered card layout (max-w-md)
- Large, friendly heading
- Single email input with clear labeling
- Prominent CTA button
- Minimal, distraction-free design

**OTP Verification**:
- 6-digit OTP input with individual boxes
- Auto-focus and auto-advance behavior
- Clear timer display
- Resend option with disabled state during cooldown

**Registration Form** (New Users):
- Clean two-column layout on desktop (Full Name | Mobile)
- Single column on mobile
- Clear field labels and validation messages
- Progress indicator if multi-step

### Document Upload

**Upload Zone**:
- Large, dashed border dropzone (min-h-64)
- Centered icon + instruction text
- Drag-over state with accent border
- File type badges (PDF, DOCX, TXT) displayed prominently
- File size limit clearly stated

**File List** (After Upload):
- Compact rows with filename, size, remove button
- File type icon on left
- Upload progress bar for active uploads
- Success/error states clearly indicated

### Dashboards

**Student Dashboard**:
- Stats cards at top: grid-cols-2 md:grid-cols-4 (Total Scans, Avg Score, Last Scan, Quota Remaining)
- Each stat card: Large number, small label, subtle icon
- Recent submissions table with sortable columns
- Quick actions: "New Scan" prominent button (top-right)

**Teacher Dashboard**:
- Class/student filter dropdowns at top
- Submissions table with: Student name, Document, Score (color-coded), Date, Actions
- Bulk action toolbar when items selected
- Export/download options

### Plagiarism Report

**Report Header**:
- Large plagiarism percentage with visual ring/arc chart
- Overall verdict (Original/Moderate/High) with clear labeling
- Document metadata: filename, date, word count
- Action buttons: Download PDF, Print, Share

**Color-Coded Highlighting System**:
- High similarity (>80%): bg-red-100 border-l-4 border-red-500
- Medium similarity (50-80%): bg-yellow-100 border-l-4 border-yellow-500
- Low similarity (<50%): bg-green-100 border-l-4 border-green-500
- Apply to both inline document view and source cards

**Document Viewer**:
- Clean, readable document rendering (prose max-w-4xl)
- Line numbers on left for reference
- Highlighted sections clickable to show source details
- Tooltip on hover showing similarity %

**Source Matches Section**:
- Card-based layout for each matched source
- Source URL (clickable), similarity %, matched text preview
- Side-by-side comparison on click (split view)
- Expand/collapse functionality

**Charts & Visualizations**:
- Pie chart: Plagiarism breakdown by source
- Bar chart: Similarity distribution by section
- Clean, minimal chart styling with clear legends
- Use subtle grid lines, clear axis labels

### Data Tables

**Submissions Table**:
- Zebra striping for readability (even rows slightly different)
- Sortable column headers with arrow indicators
- Row hover state with subtle background change
- Status badges: Scanning (blue), Complete (green), Failed (red)
- Actions dropdown on row hover/click

### Forms & Inputs

**Input Fields**:
- Clear label above input
- Border focus state with accent ring
- Error states: red border + error message below
- Success states: green checkmark icon
- Consistent padding (px-4 py-2)

**Buttons**:
- Primary CTA: Solid background, medium rounded corners
- Secondary: Outline style with subtle hover fill
- Sizes: sm (py-2 px-4), default (py-2.5 px-6), lg (py-3 px-8)
- Disabled state: reduced opacity, no hover
- Loading state: spinner icon

### Status & Feedback

**Progress Indicators**:
- Scanning progress: Linear bar with percentage text
- Segmented for multi-step processes
- Animated pulse during active scanning
- Estimated time remaining displayed

**Notifications/Toasts**:
- Top-right positioned, slide-in animation
- Success (green), Error (red), Info (blue), Warning (yellow)
- Auto-dismiss after 5s, manual close button
- Stack multiple notifications vertically

**Empty States**:
- Centered icon + message + CTA
- Friendly, encouraging copy
- Clear next action guidance

## Specific Feature Designs

### Report PDF Export

- Professional header with logo and report metadata
- Table of contents for multi-page reports
- Charts rendered as high-quality images
- Clean typography matching web version
- Page numbers and footer with generation timestamp

### Real-time Scanning Status

- Full-width banner at top during active scan
- Progress bar with percentage
- Status messages: "Extracting text... Done", "Searching web sources... 45%"
- Cancel scan option prominently available

## Visual Treatment Notes

**Shadows & Depth**:
- Cards: shadow-sm with hover:shadow-md transition
- Modals/overlays: shadow-xl with backdrop blur
- Dropdowns: shadow-lg
- Minimal use - only where hierarchy matters

**Borders & Dividers**:
- Subtle borders: border-gray-200
- Section dividers: border-t with generous padding
- Card outlines: border with rounded-lg corners

**Spacing Consistency**:
- Card padding: p-6
- Section spacing: mb-12 between major sections
- List item gaps: gap-4
- Button spacing: mr-3 between adjacent buttons

**Accessibility**:
- High contrast ratios for all text (WCAG AA minimum)
- Focus indicators on all interactive elements (ring-2 ring-offset-2)
- Clear error states with text, not just visual
- Screen reader labels for icon-only buttons

This design creates a modern, professional plagiarism checking platform that feels significantly more polished than Turnitin while maintaining academic credibility and functional clarity.