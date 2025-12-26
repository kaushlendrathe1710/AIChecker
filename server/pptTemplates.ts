export interface SlideTemplate {
  id: string;
  name: string;
  category: "title" | "content" | "image" | "twoColumn" | "quote" | "team" | "closing" | "chart" | "bullets" | "smartart" | "timeline" | "agenda";
  thumbnail: string;
  fields: SlideField[];
}

export interface SlideField {
  id: string;
  type: "text" | "title" | "subtitle" | "body" | "image" | "list" | "footer";
  label: string;
  placeholder: string;
  required?: boolean;
  maxLength?: number;
}

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  theme: ThemeConfig;
  defaultSlides: string[];
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  headingFont: string;
}

export const slideTemplates: SlideTemplate[] = [
  // ===== TITLE SLIDES =====
  {
    id: "title-centered",
    name: "Title - Centered",
    category: "title",
    thumbnail: "/slides/title-centered.png",
    fields: [
      { id: "title", type: "title", label: "Title", placeholder: "Presentation Title", required: true, maxLength: 100 },
      { id: "subtitle", type: "subtitle", label: "Subtitle", placeholder: "Your subtitle here", maxLength: 150 },
      { id: "author", type: "text", label: "Author", placeholder: "Your name", maxLength: 50 },
      { id: "date", type: "text", label: "Date", placeholder: "December 2024", maxLength: 30 },
    ],
  },
  {
    id: "title-left",
    name: "Title - Left Aligned",
    category: "title",
    thumbnail: "/slides/title-left.png",
    fields: [
      { id: "title", type: "title", label: "Title", placeholder: "Presentation Title", required: true, maxLength: 100 },
      { id: "subtitle", type: "subtitle", label: "Subtitle", placeholder: "Your subtitle here", maxLength: 150 },
      { id: "organization", type: "text", label: "Organization", placeholder: "Company/School name", maxLength: 50 },
    ],
  },
  {
    id: "title-bold",
    name: "Title - Bold Impact",
    category: "title",
    thumbnail: "/slides/title-bold.png",
    fields: [
      { id: "title", type: "title", label: "Title", placeholder: "BIG STATEMENT", required: true, maxLength: 50 },
      { id: "tagline", type: "subtitle", label: "Tagline", placeholder: "Supporting message", maxLength: 100 },
    ],
  },
  {
    id: "title-section",
    name: "Section Divider",
    category: "title",
    thumbnail: "/slides/title-section.png",
    fields: [
      { id: "sectionNumber", type: "text", label: "Section Number", placeholder: "01", maxLength: 10 },
      { id: "title", type: "title", label: "Section Title", placeholder: "Introduction", required: true, maxLength: 50 },
      { id: "description", type: "text", label: "Brief Description", placeholder: "What this section covers", maxLength: 100 },
    ],
  },

  // ===== AGENDA/TABLE OF CONTENTS =====
  {
    id: "agenda-simple",
    name: "Agenda - Simple",
    category: "agenda",
    thumbnail: "/slides/agenda-simple.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Today's Agenda", required: true, maxLength: 50 },
      { id: "item1", type: "text", label: "Topic 1", placeholder: "Introduction", maxLength: 50 },
      { id: "item2", type: "text", label: "Topic 2", placeholder: "Main Content", maxLength: 50 },
      { id: "item3", type: "text", label: "Topic 3", placeholder: "Discussion", maxLength: 50 },
      { id: "item4", type: "text", label: "Topic 4", placeholder: "Q&A", maxLength: 50 },
      { id: "item5", type: "text", label: "Topic 5", placeholder: "Next Steps", maxLength: 50 },
    ],
  },
  {
    id: "agenda-numbered",
    name: "Agenda - Numbered",
    category: "agenda",
    thumbnail: "/slides/agenda-numbered.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Outline", required: true, maxLength: 50 },
      { id: "topic1", type: "text", label: "1. Topic", placeholder: "Background & Context", maxLength: 60 },
      { id: "desc1", type: "text", label: "1. Description", placeholder: "Brief overview", maxLength: 80 },
      { id: "topic2", type: "text", label: "2. Topic", placeholder: "Key Findings", maxLength: 60 },
      { id: "desc2", type: "text", label: "2. Description", placeholder: "Research results", maxLength: 80 },
      { id: "topic3", type: "text", label: "3. Topic", placeholder: "Recommendations", maxLength: 60 },
      { id: "desc3", type: "text", label: "3. Description", placeholder: "Action items", maxLength: 80 },
    ],
  },

  // ===== CONTENT SLIDES =====
  {
    id: "content-basic",
    name: "Content - Basic",
    category: "content",
    thumbnail: "/slides/content-basic.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Slide Heading", required: true, maxLength: 80 },
      { id: "body", type: "body", label: "Content", placeholder: "Enter your main content here...", maxLength: 500 },
    ],
  },
  {
    id: "content-highlight",
    name: "Content - Key Highlight",
    category: "content",
    thumbnail: "/slides/content-highlight.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Key Insight", required: true, maxLength: 60 },
      { id: "highlight", type: "text", label: "Highlight Text", placeholder: "The main point to remember", required: true, maxLength: 100 },
      { id: "explanation", type: "body", label: "Explanation", placeholder: "Supporting details...", maxLength: 300 },
    ],
  },
  {
    id: "content-icon-text",
    name: "Content - Icon + Text",
    category: "content",
    thumbnail: "/slides/content-icon-text.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Feature Spotlight", required: true, maxLength: 60 },
      { id: "icon", type: "text", label: "Icon Name", placeholder: "star, heart, check, rocket", maxLength: 30 },
      { id: "subheading", type: "text", label: "Subheading", placeholder: "Feature Name", maxLength: 50 },
      { id: "description", type: "body", label: "Description", placeholder: "Detailed explanation...", maxLength: 300 },
    ],
  },

  // ===== BULLET/LIST SLIDES =====
  {
    id: "content-bullets",
    name: "Bullet Points",
    category: "bullets",
    thumbnail: "/slides/content-bullets.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Key Points", required: true, maxLength: 80 },
      { id: "bullet1", type: "text", label: "Point 1", placeholder: "First key point", maxLength: 100 },
      { id: "bullet2", type: "text", label: "Point 2", placeholder: "Second key point", maxLength: 100 },
      { id: "bullet3", type: "text", label: "Point 3", placeholder: "Third key point", maxLength: 100 },
      { id: "bullet4", type: "text", label: "Point 4", placeholder: "Fourth key point (optional)", maxLength: 100 },
      { id: "bullet5", type: "text", label: "Point 5", placeholder: "Fifth key point (optional)", maxLength: 100 },
    ],
  },
  {
    id: "content-numbered",
    name: "Numbered List",
    category: "bullets",
    thumbnail: "/slides/content-numbered.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Steps/Process", required: true, maxLength: 80 },
      { id: "item1", type: "text", label: "Step 1", placeholder: "First step", maxLength: 100 },
      { id: "item2", type: "text", label: "Step 2", placeholder: "Second step", maxLength: 100 },
      { id: "item3", type: "text", label: "Step 3", placeholder: "Third step", maxLength: 100 },
      { id: "item4", type: "text", label: "Step 4", placeholder: "Fourth step (optional)", maxLength: 100 },
    ],
  },
  {
    id: "bullets-icons",
    name: "Icon Bullets",
    category: "bullets",
    thumbnail: "/slides/bullets-icons.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Features", required: true, maxLength: 60 },
      { id: "icon1", type: "text", label: "Icon 1", placeholder: "check", maxLength: 20 },
      { id: "point1", type: "text", label: "Point 1", placeholder: "Easy to use interface", maxLength: 80 },
      { id: "icon2", type: "text", label: "Icon 2", placeholder: "zap", maxLength: 20 },
      { id: "point2", type: "text", label: "Point 2", placeholder: "Lightning fast performance", maxLength: 80 },
      { id: "icon3", type: "text", label: "Icon 3", placeholder: "shield", maxLength: 20 },
      { id: "point3", type: "text", label: "Point 3", placeholder: "Enterprise-grade security", maxLength: 80 },
      { id: "icon4", type: "text", label: "Icon 4", placeholder: "heart", maxLength: 20 },
      { id: "point4", type: "text", label: "Point 4", placeholder: "Customer satisfaction", maxLength: 80 },
    ],
  },
  {
    id: "keywords-cloud",
    name: "Keywords Cloud",
    category: "bullets",
    thumbnail: "/slides/keywords-cloud.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Key Concepts", required: true, maxLength: 50 },
      { id: "keyword1", type: "text", label: "Keyword 1 (Large)", placeholder: "Innovation", maxLength: 25 },
      { id: "keyword2", type: "text", label: "Keyword 2 (Large)", placeholder: "Growth", maxLength: 25 },
      { id: "keyword3", type: "text", label: "Keyword 3 (Medium)", placeholder: "Strategy", maxLength: 25 },
      { id: "keyword4", type: "text", label: "Keyword 4 (Medium)", placeholder: "Success", maxLength: 25 },
      { id: "keyword5", type: "text", label: "Keyword 5 (Small)", placeholder: "Leadership", maxLength: 25 },
      { id: "keyword6", type: "text", label: "Keyword 6 (Small)", placeholder: "Vision", maxLength: 25 },
      { id: "keyword7", type: "text", label: "Keyword 7 (Small)", placeholder: "Excellence", maxLength: 25 },
      { id: "keyword8", type: "text", label: "Keyword 8 (Small)", placeholder: "Quality", maxLength: 25 },
    ],
  },

  // ===== SMARTART SLIDES =====
  {
    id: "smartart-process",
    name: "Process Flow (4 Steps)",
    category: "smartart",
    thumbnail: "/slides/smartart-process.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Our Process", required: true, maxLength: 50 },
      { id: "step1Title", type: "text", label: "Step 1 Title", placeholder: "Research", maxLength: 20 },
      { id: "step1Desc", type: "text", label: "Step 1 Description", placeholder: "Gather requirements", maxLength: 50 },
      { id: "step2Title", type: "text", label: "Step 2 Title", placeholder: "Design", maxLength: 20 },
      { id: "step2Desc", type: "text", label: "Step 2 Description", placeholder: "Create solutions", maxLength: 50 },
      { id: "step3Title", type: "text", label: "Step 3 Title", placeholder: "Build", maxLength: 20 },
      { id: "step3Desc", type: "text", label: "Step 3 Description", placeholder: "Develop product", maxLength: 50 },
      { id: "step4Title", type: "text", label: "Step 4 Title", placeholder: "Launch", maxLength: 20 },
      { id: "step4Desc", type: "text", label: "Step 4 Description", placeholder: "Go to market", maxLength: 50 },
    ],
  },
  {
    id: "smartart-cycle",
    name: "Cycle Diagram",
    category: "smartart",
    thumbnail: "/slides/smartart-cycle.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Continuous Improvement", required: true, maxLength: 50 },
      { id: "centerText", type: "text", label: "Center Text", placeholder: "Core Value", maxLength: 20 },
      { id: "phase1", type: "text", label: "Phase 1", placeholder: "Plan", maxLength: 25 },
      { id: "phase2", type: "text", label: "Phase 2", placeholder: "Do", maxLength: 25 },
      { id: "phase3", type: "text", label: "Phase 3", placeholder: "Check", maxLength: 25 },
      { id: "phase4", type: "text", label: "Phase 4", placeholder: "Act", maxLength: 25 },
    ],
  },
  {
    id: "smartart-pyramid",
    name: "Pyramid Diagram",
    category: "smartart",
    thumbnail: "/slides/smartart-pyramid.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Priority Hierarchy", required: true, maxLength: 50 },
      { id: "level1", type: "text", label: "Top Level", placeholder: "Vision", maxLength: 30 },
      { id: "level1Desc", type: "text", label: "Top Description", placeholder: "Ultimate goal", maxLength: 50 },
      { id: "level2", type: "text", label: "Middle Level", placeholder: "Strategy", maxLength: 30 },
      { id: "level2Desc", type: "text", label: "Middle Description", placeholder: "How we get there", maxLength: 50 },
      { id: "level3", type: "text", label: "Base Level", placeholder: "Tactics", maxLength: 30 },
      { id: "level3Desc", type: "text", label: "Base Description", placeholder: "Daily actions", maxLength: 50 },
    ],
  },
  {
    id: "smartart-venn",
    name: "Venn Diagram (3 Circles)",
    category: "smartart",
    thumbnail: "/slides/smartart-venn.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Overlap Analysis", required: true, maxLength: 50 },
      { id: "circle1", type: "text", label: "Circle 1", placeholder: "Technology", maxLength: 25 },
      { id: "circle2", type: "text", label: "Circle 2", placeholder: "Business", maxLength: 25 },
      { id: "circle3", type: "text", label: "Circle 3", placeholder: "Design", maxLength: 25 },
      { id: "center", type: "text", label: "Center (All 3)", placeholder: "Innovation", maxLength: 25 },
    ],
  },
  {
    id: "smartart-matrix",
    name: "Matrix Grid (2x2)",
    category: "smartart",
    thumbnail: "/slides/smartart-matrix.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Decision Matrix", required: true, maxLength: 50 },
      { id: "xAxisLabel", type: "text", label: "X-Axis Label", placeholder: "Impact", maxLength: 20 },
      { id: "yAxisLabel", type: "text", label: "Y-Axis Label", placeholder: "Effort", maxLength: 20 },
      { id: "quadrant1", type: "text", label: "Top-Left", placeholder: "Quick Wins", maxLength: 30 },
      { id: "quadrant2", type: "text", label: "Top-Right", placeholder: "Major Projects", maxLength: 30 },
      { id: "quadrant3", type: "text", label: "Bottom-Left", placeholder: "Fill-ins", maxLength: 30 },
      { id: "quadrant4", type: "text", label: "Bottom-Right", placeholder: "Avoid", maxLength: 30 },
    ],
  },
  {
    id: "smartart-hierarchy",
    name: "Org Chart (Hierarchy)",
    category: "smartart",
    thumbnail: "/slides/smartart-hierarchy.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Organization Structure", required: true, maxLength: 50 },
      { id: "topTitle", type: "text", label: "Top Position", placeholder: "CEO", maxLength: 30 },
      { id: "topName", type: "text", label: "Top Name", placeholder: "John Smith", maxLength: 30 },
      { id: "left1Title", type: "text", label: "Left Position", placeholder: "CTO", maxLength: 25 },
      { id: "left1Name", type: "text", label: "Left Name", placeholder: "Jane Doe", maxLength: 25 },
      { id: "center1Title", type: "text", label: "Center Position", placeholder: "COO", maxLength: 25 },
      { id: "center1Name", type: "text", label: "Center Name", placeholder: "Mike Johnson", maxLength: 25 },
      { id: "right1Title", type: "text", label: "Right Position", placeholder: "CFO", maxLength: 25 },
      { id: "right1Name", type: "text", label: "Right Name", placeholder: "Sarah Brown", maxLength: 25 },
    ],
  },
  {
    id: "smartart-funnel",
    name: "Funnel Diagram",
    category: "smartart",
    thumbnail: "/slides/smartart-funnel.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Sales Funnel", required: true, maxLength: 50 },
      { id: "stage1", type: "text", label: "Stage 1 (Widest)", placeholder: "Awareness", maxLength: 30 },
      { id: "stage1Value", type: "text", label: "Stage 1 Value", placeholder: "10,000 visitors", maxLength: 30 },
      { id: "stage2", type: "text", label: "Stage 2", placeholder: "Interest", maxLength: 30 },
      { id: "stage2Value", type: "text", label: "Stage 2 Value", placeholder: "2,500 leads", maxLength: 30 },
      { id: "stage3", type: "text", label: "Stage 3", placeholder: "Decision", maxLength: 30 },
      { id: "stage3Value", type: "text", label: "Stage 3 Value", placeholder: "500 qualified", maxLength: 30 },
      { id: "stage4", type: "text", label: "Stage 4 (Narrowest)", placeholder: "Action", maxLength: 30 },
      { id: "stage4Value", type: "text", label: "Stage 4 Value", placeholder: "100 customers", maxLength: 30 },
    ],
  },

  // ===== TIMELINE SLIDES =====
  {
    id: "timeline-horizontal",
    name: "Timeline - Horizontal",
    category: "timeline",
    thumbnail: "/slides/timeline-horizontal.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Project Timeline", required: true, maxLength: 50 },
      { id: "date1", type: "text", label: "Date 1", placeholder: "Jan 2024", maxLength: 20 },
      { id: "event1", type: "text", label: "Event 1", placeholder: "Project Kickoff", maxLength: 40 },
      { id: "date2", type: "text", label: "Date 2", placeholder: "Mar 2024", maxLength: 20 },
      { id: "event2", type: "text", label: "Event 2", placeholder: "Phase 1 Complete", maxLength: 40 },
      { id: "date3", type: "text", label: "Date 3", placeholder: "Jun 2024", maxLength: 20 },
      { id: "event3", type: "text", label: "Event 3", placeholder: "Beta Launch", maxLength: 40 },
      { id: "date4", type: "text", label: "Date 4", placeholder: "Sep 2024", maxLength: 20 },
      { id: "event4", type: "text", label: "Event 4", placeholder: "Full Release", maxLength: 40 },
    ],
  },
  {
    id: "timeline-roadmap",
    name: "Roadmap - Quarters",
    category: "timeline",
    thumbnail: "/slides/timeline-roadmap.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Product Roadmap 2024", required: true, maxLength: 50 },
      { id: "q1Title", type: "text", label: "Q1 Focus", placeholder: "Foundation", maxLength: 30 },
      { id: "q1Items", type: "body", label: "Q1 Deliverables", placeholder: "Core features, MVP launch", maxLength: 100 },
      { id: "q2Title", type: "text", label: "Q2 Focus", placeholder: "Growth", maxLength: 30 },
      { id: "q2Items", type: "body", label: "Q2 Deliverables", placeholder: "Marketing push, integrations", maxLength: 100 },
      { id: "q3Title", type: "text", label: "Q3 Focus", placeholder: "Scale", maxLength: 30 },
      { id: "q3Items", type: "body", label: "Q3 Deliverables", placeholder: "Enterprise features, expansion", maxLength: 100 },
      { id: "q4Title", type: "text", label: "Q4 Focus", placeholder: "Optimize", maxLength: 30 },
      { id: "q4Items", type: "body", label: "Q4 Deliverables", placeholder: "Performance, analytics", maxLength: 100 },
    ],
  },

  // ===== TWO COLUMN SLIDES =====
  {
    id: "two-column",
    name: "Two Columns",
    category: "twoColumn",
    thumbnail: "/slides/two-column.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Comparison/Two Topics", required: true, maxLength: 80 },
      { id: "leftTitle", type: "text", label: "Left Title", placeholder: "Topic A", maxLength: 40 },
      { id: "leftContent", type: "body", label: "Left Content", placeholder: "Left side content...", maxLength: 250 },
      { id: "rightTitle", type: "text", label: "Right Title", placeholder: "Topic B", maxLength: 40 },
      { id: "rightContent", type: "body", label: "Right Content", placeholder: "Right side content...", maxLength: 250 },
    ],
  },
  {
    id: "two-column-bullets",
    name: "Two Columns - Bullets",
    category: "twoColumn",
    thumbnail: "/slides/two-column-bullets.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Compare & Contrast", required: true, maxLength: 80 },
      { id: "leftTitle", type: "text", label: "Left Title", placeholder: "Pros", maxLength: 40 },
      { id: "leftBullet1", type: "text", label: "Left Point 1", placeholder: "First advantage", maxLength: 80 },
      { id: "leftBullet2", type: "text", label: "Left Point 2", placeholder: "Second advantage", maxLength: 80 },
      { id: "leftBullet3", type: "text", label: "Left Point 3", placeholder: "Third advantage", maxLength: 80 },
      { id: "rightTitle", type: "text", label: "Right Title", placeholder: "Cons", maxLength: 40 },
      { id: "rightBullet1", type: "text", label: "Right Point 1", placeholder: "First disadvantage", maxLength: 80 },
      { id: "rightBullet2", type: "text", label: "Right Point 2", placeholder: "Second disadvantage", maxLength: 80 },
      { id: "rightBullet3", type: "text", label: "Right Point 3", placeholder: "Third disadvantage", maxLength: 80 },
    ],
  },
  {
    id: "three-column",
    name: "Three Columns",
    category: "twoColumn",
    thumbnail: "/slides/three-column.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Our Services", required: true, maxLength: 60 },
      { id: "col1Icon", type: "text", label: "Column 1 Icon", placeholder: "star", maxLength: 20 },
      { id: "col1Title", type: "text", label: "Column 1 Title", placeholder: "Basic", maxLength: 30 },
      { id: "col1Content", type: "body", label: "Column 1 Content", placeholder: "Entry-level features", maxLength: 150 },
      { id: "col2Icon", type: "text", label: "Column 2 Icon", placeholder: "zap", maxLength: 20 },
      { id: "col2Title", type: "text", label: "Column 2 Title", placeholder: "Pro", maxLength: 30 },
      { id: "col2Content", type: "body", label: "Column 2 Content", placeholder: "Advanced features", maxLength: 150 },
      { id: "col3Icon", type: "text", label: "Column 3 Icon", placeholder: "crown", maxLength: 20 },
      { id: "col3Title", type: "text", label: "Column 3 Title", placeholder: "Enterprise", maxLength: 30 },
      { id: "col3Content", type: "body", label: "Column 3 Content", placeholder: "Full suite", maxLength: 150 },
    ],
  },
  {
    id: "comparison-table",
    name: "Comparison Table",
    category: "twoColumn",
    thumbnail: "/slides/comparison-table.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Feature Comparison", required: true, maxLength: 50 },
      { id: "feature1", type: "text", label: "Feature 1", placeholder: "Price", maxLength: 30 },
      { id: "option1Val1", type: "text", label: "Option A - Feature 1", placeholder: "$99", maxLength: 20 },
      { id: "option2Val1", type: "text", label: "Option B - Feature 1", placeholder: "$149", maxLength: 20 },
      { id: "feature2", type: "text", label: "Feature 2", placeholder: "Users", maxLength: 30 },
      { id: "option1Val2", type: "text", label: "Option A - Feature 2", placeholder: "5", maxLength: 20 },
      { id: "option2Val2", type: "text", label: "Option B - Feature 2", placeholder: "Unlimited", maxLength: 20 },
      { id: "feature3", type: "text", label: "Feature 3", placeholder: "Support", maxLength: 30 },
      { id: "option1Val3", type: "text", label: "Option A - Feature 3", placeholder: "Email", maxLength: 20 },
      { id: "option2Val3", type: "text", label: "Option B - Feature 3", placeholder: "24/7 Phone", maxLength: 20 },
    ],
  },

  // ===== IMAGE SLIDES =====
  {
    id: "image-full",
    name: "Full Image",
    category: "image",
    thumbnail: "/slides/image-full.png",
    fields: [
      { id: "imageUrl", type: "image", label: "Image URL", placeholder: "https://example.com/image.jpg", required: true },
      { id: "caption", type: "text", label: "Caption", placeholder: "Image caption (optional)", maxLength: 100 },
    ],
  },
  {
    id: "image-left",
    name: "Image Left + Text",
    category: "image",
    thumbnail: "/slides/image-left.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Topic Title", required: true, maxLength: 80 },
      { id: "imageUrl", type: "image", label: "Image URL", placeholder: "https://example.com/image.jpg" },
      { id: "content", type: "body", label: "Content", placeholder: "Description text...", maxLength: 300 },
    ],
  },
  {
    id: "image-right",
    name: "Text + Image Right",
    category: "image",
    thumbnail: "/slides/image-right.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Topic Title", required: true, maxLength: 80 },
      { id: "content", type: "body", label: "Content", placeholder: "Description text...", maxLength: 300 },
      { id: "imageUrl", type: "image", label: "Image URL", placeholder: "https://example.com/image.jpg" },
    ],
  },
  {
    id: "image-gallery",
    name: "Image Gallery (4 Images)",
    category: "image",
    thumbnail: "/slides/image-gallery.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Photo Gallery", maxLength: 50 },
      { id: "image1Url", type: "image", label: "Image 1 URL", placeholder: "https://..." },
      { id: "image1Caption", type: "text", label: "Image 1 Caption", placeholder: "Caption 1", maxLength: 30 },
      { id: "image2Url", type: "image", label: "Image 2 URL", placeholder: "https://..." },
      { id: "image2Caption", type: "text", label: "Image 2 Caption", placeholder: "Caption 2", maxLength: 30 },
      { id: "image3Url", type: "image", label: "Image 3 URL", placeholder: "https://..." },
      { id: "image3Caption", type: "text", label: "Image 3 Caption", placeholder: "Caption 3", maxLength: 30 },
      { id: "image4Url", type: "image", label: "Image 4 URL", placeholder: "https://..." },
      { id: "image4Caption", type: "text", label: "Image 4 Caption", placeholder: "Caption 4", maxLength: 30 },
    ],
  },

  // ===== QUOTE SLIDES =====
  {
    id: "quote-centered",
    name: "Quote - Centered",
    category: "quote",
    thumbnail: "/slides/quote-centered.png",
    fields: [
      { id: "quote", type: "body", label: "Quote", placeholder: "Enter the quote text...", required: true, maxLength: 300 },
      { id: "author", type: "text", label: "Author", placeholder: "- Author Name", maxLength: 50 },
      { id: "source", type: "text", label: "Source", placeholder: "Book/Speech/etc.", maxLength: 50 },
    ],
  },
  {
    id: "quote-large",
    name: "Quote - Large Text",
    category: "quote",
    thumbnail: "/slides/quote-large.png",
    fields: [
      { id: "quote", type: "body", label: "Quote", placeholder: "Short impactful quote...", required: true, maxLength: 150 },
      { id: "author", type: "text", label: "Author", placeholder: "- Author Name", maxLength: 50 },
    ],
  },
  {
    id: "quote-testimonial",
    name: "Testimonial",
    category: "quote",
    thumbnail: "/slides/quote-testimonial.png",
    fields: [
      { id: "quote", type: "body", label: "Testimonial", placeholder: "Customer feedback...", required: true, maxLength: 250 },
      { id: "name", type: "text", label: "Customer Name", placeholder: "Jane Smith", maxLength: 40 },
      { id: "title", type: "text", label: "Title/Company", placeholder: "CEO at TechCorp", maxLength: 50 },
      { id: "rating", type: "text", label: "Rating (1-5)", placeholder: "5", maxLength: 5 },
    ],
  },

  // ===== TEAM SLIDES =====
  {
    id: "team-single",
    name: "Team Member",
    category: "team",
    thumbnail: "/slides/team-single.png",
    fields: [
      { id: "heading", type: "title", label: "Section Title", placeholder: "Meet Our Team", maxLength: 50 },
      { id: "name", type: "text", label: "Name", placeholder: "John Doe", required: true, maxLength: 50 },
      { id: "role", type: "text", label: "Role/Title", placeholder: "CEO & Founder", maxLength: 50 },
      { id: "bio", type: "body", label: "Bio", placeholder: "Brief bio...", maxLength: 200 },
      { id: "imageUrl", type: "image", label: "Photo URL", placeholder: "https://example.com/photo.jpg" },
    ],
  },
  {
    id: "team-grid",
    name: "Team Grid (4 Members)",
    category: "team",
    thumbnail: "/slides/team-grid.png",
    fields: [
      { id: "heading", type: "title", label: "Section Title", placeholder: "Our Team", maxLength: 50 },
      { id: "member1Name", type: "text", label: "Member 1 Name", placeholder: "Name", maxLength: 30 },
      { id: "member1Role", type: "text", label: "Member 1 Role", placeholder: "Role", maxLength: 30 },
      { id: "member2Name", type: "text", label: "Member 2 Name", placeholder: "Name", maxLength: 30 },
      { id: "member2Role", type: "text", label: "Member 2 Role", placeholder: "Role", maxLength: 30 },
      { id: "member3Name", type: "text", label: "Member 3 Name", placeholder: "Name", maxLength: 30 },
      { id: "member3Role", type: "text", label: "Member 3 Role", placeholder: "Role", maxLength: 30 },
      { id: "member4Name", type: "text", label: "Member 4 Name", placeholder: "Name", maxLength: 30 },
      { id: "member4Role", type: "text", label: "Member 4 Role", placeholder: "Role", maxLength: 30 },
    ],
  },

  // ===== CHART/DATA SLIDES =====
  {
    id: "chart-bar",
    name: "Bar Chart",
    category: "chart",
    thumbnail: "/slides/chart-bar.png",
    fields: [
      { id: "heading", type: "title", label: "Chart Title", placeholder: "Sales by Quarter", required: true, maxLength: 80 },
      { id: "label1", type: "text", label: "Label 1", placeholder: "Q1", maxLength: 20 },
      { id: "value1", type: "text", label: "Value 1", placeholder: "100", maxLength: 10 },
      { id: "label2", type: "text", label: "Label 2", placeholder: "Q2", maxLength: 20 },
      { id: "value2", type: "text", label: "Value 2", placeholder: "150", maxLength: 10 },
      { id: "label3", type: "text", label: "Label 3", placeholder: "Q3", maxLength: 20 },
      { id: "value3", type: "text", label: "Value 3", placeholder: "200", maxLength: 10 },
      { id: "label4", type: "text", label: "Label 4", placeholder: "Q4", maxLength: 20 },
      { id: "value4", type: "text", label: "Value 4", placeholder: "180", maxLength: 10 },
    ],
  },
  {
    id: "chart-pie",
    name: "Pie Chart",
    category: "chart",
    thumbnail: "/slides/chart-pie.png",
    fields: [
      { id: "heading", type: "title", label: "Chart Title", placeholder: "Market Share", required: true, maxLength: 60 },
      { id: "segment1Label", type: "text", label: "Segment 1", placeholder: "Product A", maxLength: 25 },
      { id: "segment1Value", type: "text", label: "Segment 1 %", placeholder: "45", maxLength: 5 },
      { id: "segment2Label", type: "text", label: "Segment 2", placeholder: "Product B", maxLength: 25 },
      { id: "segment2Value", type: "text", label: "Segment 2 %", placeholder: "30", maxLength: 5 },
      { id: "segment3Label", type: "text", label: "Segment 3", placeholder: "Product C", maxLength: 25 },
      { id: "segment3Value", type: "text", label: "Segment 3 %", placeholder: "15", maxLength: 5 },
      { id: "segment4Label", type: "text", label: "Segment 4", placeholder: "Other", maxLength: 25 },
      { id: "segment4Value", type: "text", label: "Segment 4 %", placeholder: "10", maxLength: 5 },
    ],
  },
  {
    id: "chart-line",
    name: "Line Chart Trend",
    category: "chart",
    thumbnail: "/slides/chart-line.png",
    fields: [
      { id: "heading", type: "title", label: "Chart Title", placeholder: "Growth Over Time", required: true, maxLength: 60 },
      { id: "yAxisLabel", type: "text", label: "Y-Axis Label", placeholder: "Revenue ($K)", maxLength: 20 },
      { id: "point1Label", type: "text", label: "Point 1 (X)", placeholder: "2020", maxLength: 15 },
      { id: "point1Value", type: "text", label: "Point 1 (Y)", placeholder: "100", maxLength: 10 },
      { id: "point2Label", type: "text", label: "Point 2 (X)", placeholder: "2021", maxLength: 15 },
      { id: "point2Value", type: "text", label: "Point 2 (Y)", placeholder: "150", maxLength: 10 },
      { id: "point3Label", type: "text", label: "Point 3 (X)", placeholder: "2022", maxLength: 15 },
      { id: "point3Value", type: "text", label: "Point 3 (Y)", placeholder: "220", maxLength: 10 },
      { id: "point4Label", type: "text", label: "Point 4 (X)", placeholder: "2023", maxLength: 15 },
      { id: "point4Value", type: "text", label: "Point 4 (Y)", placeholder: "350", maxLength: 10 },
    ],
  },
  {
    id: "stats-three",
    name: "Statistics (3 Numbers)",
    category: "chart",
    thumbnail: "/slides/stats-three.png",
    fields: [
      { id: "heading", type: "title", label: "Section Title", placeholder: "Key Metrics", maxLength: 50 },
      { id: "stat1Value", type: "text", label: "Stat 1 Value", placeholder: "500+", required: true, maxLength: 20 },
      { id: "stat1Label", type: "text", label: "Stat 1 Label", placeholder: "Customers", maxLength: 30 },
      { id: "stat2Value", type: "text", label: "Stat 2 Value", placeholder: "98%", required: true, maxLength: 20 },
      { id: "stat2Label", type: "text", label: "Stat 2 Label", placeholder: "Satisfaction", maxLength: 30 },
      { id: "stat3Value", type: "text", label: "Stat 3 Value", placeholder: "24/7", required: true, maxLength: 20 },
      { id: "stat3Label", type: "text", label: "Stat 3 Label", placeholder: "Support", maxLength: 30 },
    ],
  },
  {
    id: "stats-four",
    name: "Statistics (4 Numbers)",
    category: "chart",
    thumbnail: "/slides/stats-four.png",
    fields: [
      { id: "heading", type: "title", label: "Section Title", placeholder: "By The Numbers", maxLength: 50 },
      { id: "stat1Value", type: "text", label: "Stat 1 Value", placeholder: "10K+", required: true, maxLength: 15 },
      { id: "stat1Label", type: "text", label: "Stat 1 Label", placeholder: "Users", maxLength: 25 },
      { id: "stat2Value", type: "text", label: "Stat 2 Value", placeholder: "50M", required: true, maxLength: 15 },
      { id: "stat2Label", type: "text", label: "Stat 2 Label", placeholder: "Downloads", maxLength: 25 },
      { id: "stat3Value", type: "text", label: "Stat 3 Value", placeholder: "99.9%", required: true, maxLength: 15 },
      { id: "stat3Label", type: "text", label: "Stat 3 Label", placeholder: "Uptime", maxLength: 25 },
      { id: "stat4Value", type: "text", label: "Stat 4 Value", placeholder: "150+", required: true, maxLength: 15 },
      { id: "stat4Label", type: "text", label: "Stat 4 Label", placeholder: "Countries", maxLength: 25 },
    ],
  },
  {
    id: "big-number",
    name: "Big Number Focus",
    category: "chart",
    thumbnail: "/slides/big-number.png",
    fields: [
      { id: "number", type: "text", label: "Big Number", placeholder: "2.5M", required: true, maxLength: 15 },
      { id: "label", type: "text", label: "Label", placeholder: "Active Users Worldwide", maxLength: 50 },
      { id: "context", type: "body", label: "Context", placeholder: "A 150% increase from last year", maxLength: 150 },
    ],
  },

  // ===== CLOSING SLIDES =====
  {
    id: "closing-thankyou",
    name: "Thank You",
    category: "closing",
    thumbnail: "/slides/closing-thankyou.png",
    fields: [
      { id: "title", type: "title", label: "Title", placeholder: "Thank You!", required: true, maxLength: 50 },
      { id: "message", type: "body", label: "Message", placeholder: "Questions? Contact us at...", maxLength: 200 },
      { id: "contact", type: "text", label: "Contact Info", placeholder: "email@example.com", maxLength: 100 },
    ],
  },
  {
    id: "closing-cta",
    name: "Call to Action",
    category: "closing",
    thumbnail: "/slides/closing-cta.png",
    fields: [
      { id: "headline", type: "title", label: "Headline", placeholder: "Ready to Get Started?", required: true, maxLength: 60 },
      { id: "subtext", type: "body", label: "Supporting Text", placeholder: "Join thousands of satisfied customers...", maxLength: 150 },
      { id: "ctaText", type: "text", label: "CTA Button Text", placeholder: "Sign Up Now", maxLength: 30 },
      { id: "website", type: "text", label: "Website", placeholder: "www.example.com", maxLength: 50 },
    ],
  },
  {
    id: "closing-contact",
    name: "Contact Information",
    category: "closing",
    thumbnail: "/slides/closing-contact.png",
    fields: [
      { id: "title", type: "title", label: "Title", placeholder: "Get in Touch", required: true, maxLength: 50 },
      { id: "email", type: "text", label: "Email", placeholder: "contact@example.com", maxLength: 50 },
      { id: "phone", type: "text", label: "Phone", placeholder: "+1 (555) 123-4567", maxLength: 30 },
      { id: "website", type: "text", label: "Website", placeholder: "www.example.com", maxLength: 50 },
      { id: "address", type: "body", label: "Address", placeholder: "123 Main St, City, Country", maxLength: 100 },
    ],
  },
  {
    id: "closing-qa",
    name: "Q&A Session",
    category: "closing",
    thumbnail: "/slides/closing-qa.png",
    fields: [
      { id: "title", type: "title", label: "Title", placeholder: "Questions?", required: true, maxLength: 30 },
      { id: "subtitle", type: "text", label: "Subtitle", placeholder: "We're here to help", maxLength: 50 },
      { id: "instruction", type: "body", label: "Instructions", placeholder: "Please raise your hand or type in chat...", maxLength: 150 },
    ],
  },
  {
    id: "closing-next-steps",
    name: "Next Steps",
    category: "closing",
    thumbnail: "/slides/closing-next-steps.png",
    fields: [
      { id: "heading", type: "title", label: "Heading", placeholder: "Next Steps", required: true, maxLength: 40 },
      { id: "step1", type: "text", label: "Step 1", placeholder: "Schedule follow-up meeting", maxLength: 60 },
      { id: "step2", type: "text", label: "Step 2", placeholder: "Review proposal document", maxLength: 60 },
      { id: "step3", type: "text", label: "Step 3", placeholder: "Make decision by Friday", maxLength: 60 },
      { id: "contact", type: "text", label: "Contact", placeholder: "Reach out to: name@email.com", maxLength: 60 },
    ],
  },
];

export const presentationTemplates: PresentationTemplate[] = [
  {
    id: "professional-blue",
    name: "Professional Blue",
    description: "Clean and professional template for business presentations",
    thumbnail: "/templates/professional-blue.png",
    theme: {
      primaryColor: "1a56db",
      secondaryColor: "3b82f6",
      backgroundColor: "ffffff",
      textColor: "1f2937",
      accentColor: "dbeafe",
      fontFamily: "Arial",
      headingFont: "Arial",
    },
    defaultSlides: ["title-centered", "agenda-simple", "smartart-process", "stats-three", "closing-thankyou"],
  },
  {
    id: "corporate-dark",
    name: "Corporate Dark",
    description: "Dark theme for impactful corporate presentations",
    thumbnail: "/templates/corporate-dark.png",
    theme: {
      primaryColor: "f59e0b",
      secondaryColor: "fbbf24",
      backgroundColor: "1f2937",
      textColor: "f9fafb",
      accentColor: "374151",
      fontFamily: "Arial",
      headingFont: "Arial",
    },
    defaultSlides: ["title-bold", "smartart-funnel", "chart-bar", "big-number", "closing-cta"],
  },
  {
    id: "minimal-white",
    name: "Minimal White",
    description: "Clean minimal design with lots of whitespace",
    thumbnail: "/templates/minimal-white.png",
    theme: {
      primaryColor: "111827",
      secondaryColor: "4b5563",
      backgroundColor: "ffffff",
      textColor: "374151",
      accentColor: "f3f4f6",
      fontFamily: "Helvetica",
      headingFont: "Helvetica",
    },
    defaultSlides: ["title-left", "content-highlight", "quote-large", "keywords-cloud", "closing-contact"],
  },
  {
    id: "creative-gradient",
    name: "Creative Gradient",
    description: "Vibrant gradient theme for creative presentations",
    thumbnail: "/templates/creative-gradient.png",
    theme: {
      primaryColor: "8b5cf6",
      secondaryColor: "ec4899",
      backgroundColor: "faf5ff",
      textColor: "1f2937",
      accentColor: "f3e8ff",
      fontFamily: "Arial",
      headingFont: "Arial",
    },
    defaultSlides: ["title-bold", "smartart-venn", "three-column", "timeline-horizontal", "closing-cta"],
  },
  {
    id: "academic-green",
    name: "Academic Green",
    description: "Professional template for educational content",
    thumbnail: "/templates/academic-green.png",
    theme: {
      primaryColor: "059669",
      secondaryColor: "10b981",
      backgroundColor: "ffffff",
      textColor: "1f2937",
      accentColor: "d1fae5",
      fontFamily: "Georgia",
      headingFont: "Georgia",
    },
    defaultSlides: ["title-centered", "agenda-numbered", "smartart-pyramid", "quote-centered", "closing-thankyou"],
  },
  {
    id: "startup-pitch",
    name: "Startup Pitch",
    description: "Energetic template for pitch decks and investors",
    thumbnail: "/templates/startup-orange.png",
    theme: {
      primaryColor: "ea580c",
      secondaryColor: "f97316",
      backgroundColor: "ffffff",
      textColor: "1c1917",
      accentColor: "ffedd5",
      fontFamily: "Arial",
      headingFont: "Arial",
    },
    defaultSlides: ["title-bold", "content-highlight", "smartart-funnel", "stats-four", "closing-cta"],
  },
  {
    id: "elegant-navy",
    name: "Elegant Navy",
    description: "Sophisticated navy theme for formal presentations",
    thumbnail: "/templates/elegant-navy.png",
    theme: {
      primaryColor: "1e3a5f",
      secondaryColor: "3b82f6",
      backgroundColor: "f8fafc",
      textColor: "0f172a",
      accentColor: "e2e8f0",
      fontFamily: "Times New Roman",
      headingFont: "Times New Roman",
    },
    defaultSlides: ["title-centered", "smartart-hierarchy", "comparison-table", "quote-testimonial", "closing-next-steps"],
  },
  {
    id: "tech-cyber",
    name: "Tech Cyber",
    description: "Modern tech-inspired dark theme",
    thumbnail: "/templates/tech-cyber.png",
    theme: {
      primaryColor: "06b6d4",
      secondaryColor: "22d3d3",
      backgroundColor: "0f172a",
      textColor: "e2e8f0",
      accentColor: "1e293b",
      fontFamily: "Courier New",
      headingFont: "Arial",
    },
    defaultSlides: ["title-bold", "smartart-cycle", "chart-line", "stats-three", "closing-cta"],
  },
  {
    id: "nature-earth",
    name: "Nature Earth",
    description: "Warm earthy tones for environmental topics",
    thumbnail: "/templates/nature-earth.png",
    theme: {
      primaryColor: "78350f",
      secondaryColor: "a16207",
      backgroundColor: "fffbeb",
      textColor: "451a03",
      accentColor: "fef3c7",
      fontFamily: "Georgia",
      headingFont: "Georgia",
    },
    defaultSlides: ["title-left", "smartart-cycle", "image-left", "quote-large", "closing-thankyou"],
  },
  {
    id: "healthcare-teal",
    name: "Healthcare Teal",
    description: "Professional template for medical/health presentations",
    thumbnail: "/templates/healthcare-teal.png",
    theme: {
      primaryColor: "0d9488",
      secondaryColor: "14b8a6",
      backgroundColor: "ffffff",
      textColor: "134e4a",
      accentColor: "ccfbf1",
      fontFamily: "Arial",
      headingFont: "Arial",
    },
    defaultSlides: ["title-centered", "bullets-icons", "smartart-process", "stats-four", "closing-contact"],
  },
  {
    id: "finance-gold",
    name: "Finance Gold",
    description: "Premium gold theme for financial presentations",
    thumbnail: "/templates/finance-gold.png",
    theme: {
      primaryColor: "b45309",
      secondaryColor: "d97706",
      backgroundColor: "1c1917",
      textColor: "fafaf9",
      accentColor: "292524",
      fontFamily: "Arial",
      headingFont: "Georgia",
    },
    defaultSlides: ["title-bold", "chart-pie", "chart-bar", "big-number", "closing-cta"],
  },
  {
    id: "education-red",
    name: "Education Red",
    description: "Bold red theme for educational content",
    thumbnail: "/templates/education-red.png",
    theme: {
      primaryColor: "dc2626",
      secondaryColor: "ef4444",
      backgroundColor: "ffffff",
      textColor: "1f2937",
      accentColor: "fee2e2",
      fontFamily: "Arial",
      headingFont: "Arial",
    },
    defaultSlides: ["title-centered", "agenda-numbered", "smartart-matrix", "quote-centered", "closing-qa"],
  },
  {
    id: "modern-indigo",
    name: "Modern Indigo",
    description: "Contemporary indigo theme for modern businesses",
    thumbnail: "/templates/modern-indigo.png",
    theme: {
      primaryColor: "4f46e5",
      secondaryColor: "6366f1",
      backgroundColor: "ffffff",
      textColor: "1e1b4b",
      accentColor: "e0e7ff",
      fontFamily: "Arial",
      headingFont: "Arial",
    },
    defaultSlides: ["title-left", "timeline-roadmap", "three-column", "stats-three", "closing-next-steps"],
  },
  {
    id: "simple-gray",
    name: "Simple Gray",
    description: "Understated gray theme for any occasion",
    thumbnail: "/templates/simple-gray.png",
    theme: {
      primaryColor: "4b5563",
      secondaryColor: "6b7280",
      backgroundColor: "f9fafb",
      textColor: "111827",
      accentColor: "e5e7eb",
      fontFamily: "Arial",
      headingFont: "Arial",
    },
    defaultSlides: ["title-centered", "content-basic", "two-column", "quote-large", "closing-contact"],
  },
  {
    id: "playful-pink",
    name: "Playful Pink",
    description: "Fun and creative pink theme",
    thumbnail: "/templates/playful-pink.png",
    theme: {
      primaryColor: "db2777",
      secondaryColor: "ec4899",
      backgroundColor: "fdf2f8",
      textColor: "831843",
      accentColor: "fce7f3",
      fontFamily: "Arial",
      headingFont: "Arial",
    },
    defaultSlides: ["title-bold", "keywords-cloud", "smartart-venn", "team-grid", "closing-thankyou"],
  },
];

export function getSlideTemplate(id: string): SlideTemplate | undefined {
  return slideTemplates.find(t => t.id === id);
}

export function getPresentationTemplate(id: string): PresentationTemplate | undefined {
  return presentationTemplates.find(t => t.id === id);
}

export function getSlidesByCategory(category: SlideTemplate["category"]): SlideTemplate[] {
  return slideTemplates.filter(t => t.category === category);
}
