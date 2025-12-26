import PptxGenJS from "pptxgenjs";
import { slideTemplates, presentationTemplates, ThemeConfig, SlideTemplate } from "./pptTemplates";
import OpenAI from "openai";

const openai = new OpenAI();

export interface SlideData {
  templateId: string;
  content: Record<string, string>;
  footnote?: string;
}

export interface PresentationData {
  templateId: string;
  slides: SlideData[];
  title?: string;
}

function hexToRgb(hex: string): string {
  return hex.replace("#", "");
}

async function generateFootnote(slideContent: Record<string, string>, slideTemplate: SlideTemplate): Promise<string> {
  try {
    const contentText = Object.entries(slideContent)
      .filter(([_, value]) => value && value.trim())
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");

    if (!contentText.trim()) {
      return "";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a presentation assistant. Generate a brief, helpful speaker note/footnote for the given slide content. Keep it to 1-2 sentences that would help the presenter remember key talking points. Be concise and professional."
        },
        {
          role: "user",
          content: `Slide type: ${slideTemplate.name}\n\nSlide content:\n${contentText}\n\nGenerate a brief speaker note for this slide:`
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("Failed to generate footnote:", error);
    return "";
  }
}

function addSlideContent(
  slide: PptxGenJS.Slide,
  templateId: string,
  content: Record<string, string>,
  theme: ThemeConfig,
  footnote?: string
) {
  const bgColor = hexToRgb(theme.backgroundColor);
  const textColor = hexToRgb(theme.textColor);
  const primaryColor = hexToRgb(theme.primaryColor);
  const accentColor = hexToRgb(theme.accentColor);

  slide.background = { color: bgColor };

  switch (templateId) {
    case "title-centered":
      slide.addText(content.title || "Untitled", {
        x: 0.5, y: 2, w: 9, h: 1.5,
        fontSize: 44, bold: true, color: primaryColor,
        align: "center", fontFace: theme.headingFont,
      });
      if (content.subtitle) {
        slide.addText(content.subtitle, {
          x: 0.5, y: 3.5, w: 9, h: 0.8,
          fontSize: 24, color: textColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      if (content.author || content.date) {
        slide.addText(`${content.author || ""}${content.author && content.date ? " | " : ""}${content.date || ""}`, {
          x: 0.5, y: 4.8, w: 9, h: 0.5,
          fontSize: 14, color: textColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      break;

    case "title-left":
      slide.addText(content.title || "Untitled", {
        x: 0.5, y: 2, w: 8, h: 1.5,
        fontSize: 44, bold: true, color: primaryColor,
        align: "left", fontFace: theme.headingFont,
      });
      if (content.subtitle) {
        slide.addText(content.subtitle, {
          x: 0.5, y: 3.5, w: 8, h: 0.8,
          fontSize: 24, color: textColor,
          align: "left", fontFace: theme.fontFamily,
        });
      }
      if (content.organization) {
        slide.addText(content.organization, {
          x: 0.5, y: 4.8, w: 8, h: 0.5,
          fontSize: 14, color: textColor,
          align: "left", fontFace: theme.fontFamily,
        });
      }
      break;

    case "title-bold":
      slide.addShape("rect", { x: 0, y: 0, w: 10, h: 5.63, fill: { color: primaryColor } });
      slide.addText(content.title || "STATEMENT", {
        x: 0.5, y: 2, w: 9, h: 1.5,
        fontSize: 52, bold: true, color: "FFFFFF",
        align: "center", fontFace: theme.headingFont,
      });
      if (content.tagline) {
        slide.addText(content.tagline, {
          x: 0.5, y: 3.8, w: 9, h: 0.6,
          fontSize: 20, color: "FFFFFF",
          align: "center", fontFace: theme.fontFamily,
        });
      }
      break;

    case "content-basic":
      slide.addText(content.heading || "Heading", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: primaryColor,
        fontFace: theme.headingFont,
      });
      if (content.body) {
        slide.addText(content.body, {
          x: 0.5, y: 1.5, w: 9, h: 3.5,
          fontSize: 18, color: textColor,
          fontFace: theme.fontFamily, valign: "top",
        });
      }
      break;

    case "content-bullets":
      slide.addText(content.heading || "Key Points", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: primaryColor,
        fontFace: theme.headingFont,
      });
      const bullets = [content.bullet1, content.bullet2, content.bullet3, content.bullet4, content.bullet5]
        .filter(b => b && b.trim());
      if (bullets.length > 0) {
        slide.addText(bullets.map(b => ({ text: b, options: { bullet: true } })), {
          x: 0.5, y: 1.5, w: 9, h: 3.5,
          fontSize: 20, color: textColor,
          fontFace: theme.fontFamily, valign: "top",
        });
      }
      break;

    case "content-numbered":
      slide.addText(content.heading || "Steps", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: primaryColor,
        fontFace: theme.headingFont,
      });
      const items = [content.item1, content.item2, content.item3, content.item4]
        .filter(i => i && i.trim());
      if (items.length > 0) {
        slide.addText(items.map((item, idx) => ({ text: `${idx + 1}. ${item}`, options: { breakLine: true } })), {
          x: 0.5, y: 1.5, w: 9, h: 3.5,
          fontSize: 20, color: textColor,
          fontFace: theme.fontFamily, valign: "top",
        });
      }
      break;

    case "two-column":
      slide.addText(content.heading || "Comparison", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: primaryColor,
        fontFace: theme.headingFont,
      });
      if (content.leftTitle) {
        slide.addText(content.leftTitle, {
          x: 0.5, y: 1.5, w: 4, h: 0.5,
          fontSize: 22, bold: true, color: primaryColor,
          fontFace: theme.headingFont,
        });
      }
      if (content.leftContent) {
        slide.addText(content.leftContent, {
          x: 0.5, y: 2.1, w: 4, h: 2.5,
          fontSize: 16, color: textColor,
          fontFace: theme.fontFamily, valign: "top",
        });
      }
      if (content.rightTitle) {
        slide.addText(content.rightTitle, {
          x: 5.5, y: 1.5, w: 4, h: 0.5,
          fontSize: 22, bold: true, color: primaryColor,
          fontFace: theme.headingFont,
        });
      }
      if (content.rightContent) {
        slide.addText(content.rightContent, {
          x: 5.5, y: 2.1, w: 4, h: 2.5,
          fontSize: 16, color: textColor,
          fontFace: theme.fontFamily, valign: "top",
        });
      }
      break;

    case "two-column-bullets":
      slide.addText(content.heading || "Compare", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: primaryColor,
        fontFace: theme.headingFont,
      });
      if (content.leftTitle) {
        slide.addText(content.leftTitle, {
          x: 0.5, y: 1.5, w: 4, h: 0.5,
          fontSize: 22, bold: true, color: primaryColor,
          fontFace: theme.headingFont,
        });
      }
      const leftBullets = [content.leftBullet1, content.leftBullet2, content.leftBullet3].filter(b => b);
      if (leftBullets.length > 0) {
        slide.addText(leftBullets.map(b => ({ text: b, options: { bullet: true } })), {
          x: 0.5, y: 2.1, w: 4, h: 2.5,
          fontSize: 16, color: textColor, fontFace: theme.fontFamily,
        });
      }
      if (content.rightTitle) {
        slide.addText(content.rightTitle, {
          x: 5.5, y: 1.5, w: 4, h: 0.5,
          fontSize: 22, bold: true, color: primaryColor,
          fontFace: theme.headingFont,
        });
      }
      const rightBullets = [content.rightBullet1, content.rightBullet2, content.rightBullet3].filter(b => b);
      if (rightBullets.length > 0) {
        slide.addText(rightBullets.map(b => ({ text: b, options: { bullet: true } })), {
          x: 5.5, y: 2.1, w: 4, h: 2.5,
          fontSize: 16, color: textColor, fontFace: theme.fontFamily,
        });
      }
      break;

    case "image-full":
      if (content.imageUrl) {
        slide.addImage({ path: content.imageUrl, x: 0, y: 0, w: 10, h: 5.63 });
      }
      if (content.caption) {
        slide.addShape("rect", { x: 0, y: 4.63, w: 10, h: 1, fill: { color: "000000", transparency: 50 } });
        slide.addText(content.caption, {
          x: 0.5, y: 4.8, w: 9, h: 0.6,
          fontSize: 16, color: "FFFFFF",
          align: "center", fontFace: theme.fontFamily,
        });
      }
      break;

    case "image-left":
      slide.addText(content.heading || "Topic", {
        x: 5, y: 0.5, w: 4.5, h: 0.8,
        fontSize: 28, bold: true, color: primaryColor,
        fontFace: theme.headingFont,
      });
      if (content.imageUrl) {
        slide.addImage({ path: content.imageUrl, x: 0.5, y: 0.5, w: 4, h: 4.5 });
      } else {
        slide.addShape("rect", { x: 0.5, y: 0.5, w: 4, h: 4.5, fill: { color: accentColor } });
        slide.addText("Image", { x: 0.5, y: 2.5, w: 4, h: 0.5, fontSize: 14, color: textColor, align: "center" });
      }
      if (content.content) {
        slide.addText(content.content, {
          x: 5, y: 1.5, w: 4.5, h: 3.5,
          fontSize: 16, color: textColor,
          fontFace: theme.fontFamily, valign: "top",
        });
      }
      break;

    case "image-right":
      slide.addText(content.heading || "Topic", {
        x: 0.5, y: 0.5, w: 4.5, h: 0.8,
        fontSize: 28, bold: true, color: primaryColor,
        fontFace: theme.headingFont,
      });
      if (content.content) {
        slide.addText(content.content, {
          x: 0.5, y: 1.5, w: 4.5, h: 3.5,
          fontSize: 16, color: textColor,
          fontFace: theme.fontFamily, valign: "top",
        });
      }
      if (content.imageUrl) {
        slide.addImage({ path: content.imageUrl, x: 5.5, y: 0.5, w: 4, h: 4.5 });
      } else {
        slide.addShape("rect", { x: 5.5, y: 0.5, w: 4, h: 4.5, fill: { color: accentColor } });
        slide.addText("Image", { x: 5.5, y: 2.5, w: 4, h: 0.5, fontSize: 14, color: textColor, align: "center" });
      }
      break;

    case "quote-centered":
      slide.addText(`"${content.quote || "Quote text here"}"`, {
        x: 1, y: 1.5, w: 8, h: 2,
        fontSize: 28, italic: true, color: textColor,
        align: "center", fontFace: theme.fontFamily,
      });
      if (content.author) {
        slide.addText(content.author, {
          x: 1, y: 3.8, w: 8, h: 0.5,
          fontSize: 18, color: primaryColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      if (content.source) {
        slide.addText(content.source, {
          x: 1, y: 4.3, w: 8, h: 0.5,
          fontSize: 14, italic: true, color: textColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      break;

    case "quote-large":
      slide.addShape("rect", { x: 0, y: 0, w: 10, h: 5.63, fill: { color: accentColor } });
      slide.addText(`"${content.quote || "Quote"}"`, {
        x: 0.5, y: 1.5, w: 9, h: 2.5,
        fontSize: 36, bold: true, color: primaryColor,
        align: "center", fontFace: theme.headingFont,
      });
      if (content.author) {
        slide.addText(content.author, {
          x: 0.5, y: 4.2, w: 9, h: 0.5,
          fontSize: 20, color: textColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      break;

    case "team-single":
      if (content.heading) {
        slide.addText(content.heading, {
          x: 0.5, y: 0.3, w: 9, h: 0.6,
          fontSize: 28, bold: true, color: primaryColor,
          fontFace: theme.headingFont,
        });
      }
      if (content.imageUrl) {
        slide.addImage({ path: content.imageUrl, x: 3.5, y: 1, w: 3, h: 3 });
      } else {
        slide.addShape("ellipse", { x: 3.5, y: 1, w: 3, h: 3, fill: { color: accentColor } });
      }
      slide.addText(content.name || "Name", {
        x: 1, y: 4.2, w: 8, h: 0.5,
        fontSize: 24, bold: true, color: textColor,
        align: "center", fontFace: theme.headingFont,
      });
      if (content.role) {
        slide.addText(content.role, {
          x: 1, y: 4.7, w: 8, h: 0.4,
          fontSize: 16, color: primaryColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      if (content.bio) {
        slide.addText(content.bio, {
          x: 1, y: 5.1, w: 8, h: 0.4,
          fontSize: 12, color: textColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      break;

    case "team-grid":
      if (content.heading) {
        slide.addText(content.heading, {
          x: 0.5, y: 0.3, w: 9, h: 0.6,
          fontSize: 28, bold: true, color: primaryColor,
          fontFace: theme.headingFont,
        });
      }
      const members = [
        { name: content.member1Name, role: content.member1Role, x: 0.5, y: 1 },
        { name: content.member2Name, role: content.member2Role, x: 5, y: 1 },
        { name: content.member3Name, role: content.member3Role, x: 0.5, y: 3.2 },
        { name: content.member4Name, role: content.member4Role, x: 5, y: 3.2 },
      ];
      members.forEach(m => {
        if (m.name) {
          slide.addShape("ellipse", { x: m.x + 1.2, y: m.y, w: 1.5, h: 1.5, fill: { color: accentColor } });
          slide.addText(m.name, {
            x: m.x, y: m.y + 1.6, w: 4, h: 0.4,
            fontSize: 14, bold: true, color: textColor,
            align: "center", fontFace: theme.fontFamily,
          });
          if (m.role) {
            slide.addText(m.role, {
              x: m.x, y: m.y + 2, w: 4, h: 0.3,
              fontSize: 11, color: primaryColor,
              align: "center", fontFace: theme.fontFamily,
            });
          }
        }
      });
      break;

    case "chart-bar":
      slide.addText(content.heading || "Chart", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 28, bold: true, color: primaryColor,
        fontFace: theme.headingFont,
      });
      const chartData = [
        { name: "Data", labels: [content.label1 || "A", content.label2 || "B", content.label3 || "C", content.label4 || "D"],
          values: [
            parseFloat(content.value1) || 0,
            parseFloat(content.value2) || 0,
            parseFloat(content.value3) || 0,
            parseFloat(content.value4) || 0,
          ] }
      ];
      slide.addChart("bar", chartData, {
        x: 0.5, y: 1.5, w: 9, h: 3.5,
        chartColors: [primaryColor],
        showValue: true,
        dataLabelPosition: "outEnd",
      });
      break;

    case "stats-three":
      if (content.heading) {
        slide.addText(content.heading, {
          x: 0.5, y: 0.5, w: 9, h: 0.8,
          fontSize: 28, bold: true, color: primaryColor,
          fontFace: theme.headingFont,
        });
      }
      const stats = [
        { value: content.stat1Value, label: content.stat1Label, x: 0.5 },
        { value: content.stat2Value, label: content.stat2Label, x: 3.5 },
        { value: content.stat3Value, label: content.stat3Label, x: 6.5 },
      ];
      stats.forEach(s => {
        if (s.value) {
          slide.addText(s.value, {
            x: s.x, y: 2, w: 3, h: 1,
            fontSize: 48, bold: true, color: primaryColor,
            align: "center", fontFace: theme.headingFont,
          });
          if (s.label) {
            slide.addText(s.label, {
              x: s.x, y: 3.2, w: 3, h: 0.5,
              fontSize: 16, color: textColor,
              align: "center", fontFace: theme.fontFamily,
            });
          }
        }
      });
      break;

    case "closing-thankyou":
      slide.addText(content.title || "Thank You!", {
        x: 0.5, y: 2, w: 9, h: 1,
        fontSize: 48, bold: true, color: primaryColor,
        align: "center", fontFace: theme.headingFont,
      });
      if (content.message) {
        slide.addText(content.message, {
          x: 1, y: 3.2, w: 8, h: 0.8,
          fontSize: 18, color: textColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      if (content.contact) {
        slide.addText(content.contact, {
          x: 1, y: 4.2, w: 8, h: 0.5,
          fontSize: 16, color: primaryColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      break;

    case "closing-cta":
      slide.addShape("rect", { x: 0, y: 0, w: 10, h: 5.63, fill: { color: primaryColor } });
      slide.addText(content.headline || "Get Started", {
        x: 0.5, y: 1.5, w: 9, h: 1,
        fontSize: 40, bold: true, color: "FFFFFF",
        align: "center", fontFace: theme.headingFont,
      });
      if (content.subtext) {
        slide.addText(content.subtext, {
          x: 1, y: 2.7, w: 8, h: 0.8,
          fontSize: 18, color: "FFFFFF",
          align: "center", fontFace: theme.fontFamily,
        });
      }
      if (content.ctaText) {
        slide.addShape("rect", { x: 3.5, y: 3.6, w: 3, h: 0.7, fill: { color: "FFFFFF" } });
        slide.addText(content.ctaText, {
          x: 3.5, y: 3.65, w: 3, h: 0.6,
          fontSize: 16, bold: true, color: primaryColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      if (content.website) {
        slide.addText(content.website, {
          x: 1, y: 4.6, w: 8, h: 0.5,
          fontSize: 14, color: "FFFFFF",
          align: "center", fontFace: theme.fontFamily,
        });
      }
      break;

    case "closing-contact":
      slide.addText(content.title || "Contact Us", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: primaryColor,
        fontFace: theme.headingFont, align: "center",
      });
      let yPos = 1.8;
      if (content.email) {
        slide.addText(`Email: ${content.email}`, {
          x: 2, y: yPos, w: 6, h: 0.5,
          fontSize: 18, color: textColor,
          align: "center", fontFace: theme.fontFamily,
        });
        yPos += 0.7;
      }
      if (content.phone) {
        slide.addText(`Phone: ${content.phone}`, {
          x: 2, y: yPos, w: 6, h: 0.5,
          fontSize: 18, color: textColor,
          align: "center", fontFace: theme.fontFamily,
        });
        yPos += 0.7;
      }
      if (content.website) {
        slide.addText(`Web: ${content.website}`, {
          x: 2, y: yPos, w: 6, h: 0.5,
          fontSize: 18, color: textColor,
          align: "center", fontFace: theme.fontFamily,
        });
        yPos += 0.7;
      }
      if (content.address) {
        slide.addText(content.address, {
          x: 2, y: yPos, w: 6, h: 0.8,
          fontSize: 14, color: textColor,
          align: "center", fontFace: theme.fontFamily,
        });
      }
      break;

    default:
      slide.addText(content.heading || content.title || "Slide", {
        x: 0.5, y: 2, w: 9, h: 1,
        fontSize: 32, bold: true, color: primaryColor,
        align: "center", fontFace: theme.headingFont,
      });
  }

  if (footnote) {
    slide.addNotes(footnote);
  }
}

export async function generatePresentation(data: PresentationData, generateFootnotes: boolean = true): Promise<Buffer> {
  const presentationTemplate = presentationTemplates.find(t => t.id === data.templateId);
  if (!presentationTemplate) {
    throw new Error(`Presentation template not found: ${data.templateId}`);
  }

  const pptx = new PptxGenJS();
  pptx.author = "PlagiarismGuard PPT Creator";
  pptx.title = data.title || "Presentation";
  pptx.subject = "Generated Presentation";
  pptx.company = "PlagiarismGuard";

  const theme = presentationTemplate.theme;

  for (const slideData of data.slides) {
    const slideTemplate = slideTemplates.find(t => t.id === slideData.templateId);
    if (!slideTemplate) continue;

    let footnote = slideData.footnote;
    if (generateFootnotes && !footnote) {
      footnote = await generateFootnote(slideData.content, slideTemplate);
    }

    const slide = pptx.addSlide();
    addSlideContent(slide, slideData.templateId, slideData.content, theme, footnote);
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return buffer as Buffer;
}

export { slideTemplates, presentationTemplates };
