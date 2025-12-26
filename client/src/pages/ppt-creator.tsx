import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Trash2, 
  Download, 
  GripVertical, 
  Replace, 
  ChevronUp, 
  ChevronDown,
  Presentation,
  FileText,
  Image,
  Quote,
  Users,
  BarChart3,
  Layout,
  Sparkles,
  Loader2
} from "lucide-react";

interface SlideField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required?: boolean;
  maxLength?: number;
}

interface SlideTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  fields: SlideField[];
}

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  headingFont: string;
}

interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  theme: ThemeConfig;
  defaultSlides: string[];
}

interface SlideData {
  id: string;
  templateId: string;
  content: Record<string, string>;
  footnote?: string;
}

const categoryIcons: Record<string, any> = {
  title: Presentation,
  content: FileText,
  bullets: FileText,
  twoColumn: Layout,
  image: Image,
  quote: Quote,
  team: Users,
  chart: BarChart3,
  closing: Presentation,
};

export default function PptCreator() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<PresentationTemplate | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [presentationTitle, setPresentationTitle] = useState("");
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);
  const [showSlideReplacer, setShowSlideReplacer] = useState(false);
  const [generatingFootnotes, setGeneratingFootnotes] = useState<Set<string>>(new Set());

  const { data: templatesData } = useQuery<{ templates: PresentationTemplate[] }>({
    queryKey: ["/api/ppt/templates"],
  });

  const { data: slideTemplatesData } = useQuery<{ slideTemplates: SlideTemplate[] }>({
    queryKey: ["/api/ppt/slide-templates"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ppt/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": localStorage.getItem("sessionId") || "",
        },
        body: JSON.stringify({
          templateId: selectedTemplate?.id,
          slides: slides.map(s => ({
            templateId: s.templateId,
            content: s.content,
            footnote: s.footnote,
          })),
          title: presentationTitle,
          generateFootnotes: true,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to generate presentation");
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${presentationTitle || "presentation"}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Success", description: "Presentation downloaded successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate presentation", variant: "destructive" });
    },
  });

  const handleSelectTemplate = (template: PresentationTemplate) => {
    setSelectedTemplate(template);
    setPresentationTitle("");
    
    const defaultSlides: SlideData[] = template.defaultSlides.map((slideTemplateId, index) => ({
      id: `slide-${Date.now()}-${index}`,
      templateId: slideTemplateId,
      content: {},
      footnote: "",
    }));
    
    setSlides(defaultSlides);
    setSelectedSlideIndex(0);
    setShowTemplateSelector(false);
  };

  const handleSlideContentChange = (fieldId: string, value: string) => {
    setSlides(prev => prev.map((slide, idx) => 
      idx === selectedSlideIndex 
        ? { ...slide, content: { ...slide.content, [fieldId]: value } }
        : slide
    ));
  };

  const handleAddSlide = (slideTemplateId: string) => {
    const newSlide: SlideData = {
      id: `slide-${Date.now()}`,
      templateId: slideTemplateId,
      content: {},
      footnote: "",
    };
    setSlides(prev => [...prev, newSlide]);
    setSelectedSlideIndex(slides.length);
  };

  const handleRemoveSlide = (index: number) => {
    if (slides.length <= 1) {
      toast({ title: "Cannot remove", description: "Presentation must have at least one slide", variant: "destructive" });
      return;
    }
    setSlides(prev => prev.filter((_, idx) => idx !== index));
    if (selectedSlideIndex >= index && selectedSlideIndex > 0) {
      setSelectedSlideIndex(selectedSlideIndex - 1);
    }
  };

  const handleReplaceSlide = (newTemplateId: string) => {
    setSlides(prev => prev.map((slide, idx) => 
      idx === selectedSlideIndex 
        ? { ...slide, templateId: newTemplateId, content: {}, footnote: "" }
        : slide
    ));
    setShowSlideReplacer(false);
  };

  const handleMoveSlide = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= slides.length) return;
    
    const newSlides = [...slides];
    [newSlides[fromIndex], newSlides[toIndex]] = [newSlides[toIndex], newSlides[fromIndex]];
    setSlides(newSlides);
    setSelectedSlideIndex(toIndex);
  };

  const handleGenerateFootnote = async (slideIndex: number) => {
    const slide = slides[slideIndex];
    const slideId = slide.id;
    
    setGeneratingFootnotes(prev => new Set(prev).add(slideId));
    
    try {
      const response = await apiRequest("POST", "/api/ppt/generate-footnote", {
        slideContent: slide.content,
        slideTemplateId: slide.templateId,
      }) as unknown as { footnote: string };
      
      const { footnote } = response;
      
      setSlides(prev => prev.map((s, idx) => 
        idx === slideIndex ? { ...s, footnote } : s
      ));
      
      toast({ title: "Footnote generated", description: "AI speaker note has been added to this slide" });
    } catch {
      toast({ title: "Error", description: "Failed to generate footnote", variant: "destructive" });
    } finally {
      setGeneratingFootnotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(slideId);
        return newSet;
      });
    }
  };

  const currentSlide = slides[selectedSlideIndex];
  const currentSlideTemplate = slideTemplatesData?.slideTemplates.find(t => t.id === currentSlide?.templateId);

  const getSlidePreviewContent = (slide: SlideData) => {
    const template = slideTemplatesData?.slideTemplates.find(t => t.id === slide.templateId);
    if (!template) return null;

    const theme = selectedTemplate?.theme;
    const primaryColor = theme ? `#${theme.primaryColor}` : "#1a56db";
    const bgColor = theme ? `#${theme.backgroundColor}` : "#ffffff";
    const textColor = theme ? `#${theme.textColor}` : "#1f2937";

    return (
      <div 
        className="w-full h-full p-3 rounded-md overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        <div className="text-xs font-semibold truncate" style={{ color: primaryColor }}>
          {slide.content.title || slide.content.heading || slide.content.headline || template.name}
        </div>
        {(slide.content.subtitle || slide.content.body || slide.content.content) && (
          <div className="text-[10px] mt-1 truncate" style={{ color: textColor }}>
            {slide.content.subtitle || slide.content.body || slide.content.content}
          </div>
        )}
      </div>
    );
  };

  const renderSlidePreview = () => {
    if (!currentSlide || !selectedTemplate) return null;

    const theme = selectedTemplate.theme;
    const primaryColor = `#${theme.primaryColor}`;
    const bgColor = `#${theme.backgroundColor}`;
    const textColor = `#${theme.textColor}`;
    const accentColor = `#${theme.accentColor}`;

    const content = currentSlide.content;
    const templateId = currentSlide.templateId;

    return (
      <div 
        className="w-full aspect-[16/9] rounded-lg shadow-lg overflow-hidden relative"
        style={{ backgroundColor: bgColor }}
      >
        {templateId === "title-centered" && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <h1 className="text-3xl font-bold text-center" style={{ color: primaryColor }}>
              {content.title || "Presentation Title"}
            </h1>
            {content.subtitle && (
              <p className="text-lg mt-4 text-center" style={{ color: textColor }}>
                {content.subtitle}
              </p>
            )}
            {(content.author || content.date) && (
              <p className="text-sm mt-6" style={{ color: textColor }}>
                {content.author}{content.author && content.date ? " | " : ""}{content.date}
              </p>
            )}
          </div>
        )}

        {templateId === "title-left" && (
          <div className="flex flex-col justify-center h-full p-8">
            <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>
              {content.title || "Presentation Title"}
            </h1>
            {content.subtitle && (
              <p className="text-lg mt-4" style={{ color: textColor }}>
                {content.subtitle}
              </p>
            )}
            {content.organization && (
              <p className="text-sm mt-6" style={{ color: textColor }}>
                {content.organization}
              </p>
            )}
          </div>
        )}

        {templateId === "title-bold" && (
          <div 
            className="flex flex-col items-center justify-center h-full p-8"
            style={{ backgroundColor: primaryColor }}
          >
            <h1 className="text-4xl font-bold text-center text-white">
              {content.title || "BIG STATEMENT"}
            </h1>
            {content.tagline && (
              <p className="text-lg mt-4 text-center text-white opacity-90">
                {content.tagline}
              </p>
            )}
          </div>
        )}

        {templateId === "content-basic" && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
              {content.heading || "Slide Heading"}
            </h2>
            <p className="text-base leading-relaxed" style={{ color: textColor }}>
              {content.body || "Enter your main content here..."}
            </p>
          </div>
        )}

        {templateId === "content-bullets" && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
              {content.heading || "Key Points"}
            </h2>
            <ul className="space-y-2" style={{ color: textColor }}>
              {[content.bullet1, content.bullet2, content.bullet3, content.bullet4, content.bullet5]
                .filter(b => b)
                .map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span style={{ color: primaryColor }}>&#8226;</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              {!content.bullet1 && <li className="opacity-50">Add bullet points...</li>}
            </ul>
          </div>
        )}

        {templateId === "content-numbered" && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
              {content.heading || "Steps/Process"}
            </h2>
            <ol className="space-y-2" style={{ color: textColor }}>
              {[content.item1, content.item2, content.item3, content.item4]
                .filter(i => i)
                .map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold" style={{ color: primaryColor }}>{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              {!content.item1 && <li className="opacity-50">Add steps...</li>}
            </ol>
          </div>
        )}

        {templateId === "two-column" && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
              {content.heading || "Comparison"}
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>
                  {content.leftTitle || "Topic A"}
                </h3>
                <p className="text-sm" style={{ color: textColor }}>
                  {content.leftContent || "Left side content..."}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>
                  {content.rightTitle || "Topic B"}
                </h3>
                <p className="text-sm" style={{ color: textColor }}>
                  {content.rightContent || "Right side content..."}
                </p>
              </div>
            </div>
          </div>
        )}

        {templateId === "quote-centered" && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <p className="text-xl italic text-center" style={{ color: textColor }}>
              "{content.quote || "Enter the quote text..."}"
            </p>
            {content.author && (
              <p className="mt-4 font-semibold" style={{ color: primaryColor }}>
                {content.author}
              </p>
            )}
            {content.source && (
              <p className="text-sm italic" style={{ color: textColor }}>
                {content.source}
              </p>
            )}
          </div>
        )}

        {templateId === "quote-large" && (
          <div 
            className="flex flex-col items-center justify-center h-full p-8"
            style={{ backgroundColor: accentColor }}
          >
            <p className="text-2xl font-bold text-center" style={{ color: primaryColor }}>
              "{content.quote || "Quote"}"
            </p>
            {content.author && (
              <p className="mt-4" style={{ color: textColor }}>
                {content.author}
              </p>
            )}
          </div>
        )}

        {templateId === "stats-three" && (
          <div className="p-8">
            {content.heading && (
              <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: primaryColor }}>
                {content.heading}
              </h2>
            )}
            <div className="grid grid-cols-3 gap-4 mt-4">
              {[
                { value: content.stat1Value, label: content.stat1Label },
                { value: content.stat2Value, label: content.stat2Label },
                { value: content.stat3Value, label: content.stat3Label },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-3xl font-bold" style={{ color: primaryColor }}>
                    {stat.value || "0"}
                  </p>
                  <p className="text-sm mt-1" style={{ color: textColor }}>
                    {stat.label || "Label"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {templateId === "closing-thankyou" && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <h1 className="text-4xl font-bold" style={{ color: primaryColor }}>
              {content.title || "Thank You!"}
            </h1>
            {content.message && (
              <p className="text-lg mt-4 text-center" style={{ color: textColor }}>
                {content.message}
              </p>
            )}
            {content.contact && (
              <p className="mt-4" style={{ color: primaryColor }}>
                {content.contact}
              </p>
            )}
          </div>
        )}

        {templateId === "closing-cta" && (
          <div 
            className="flex flex-col items-center justify-center h-full p-8"
            style={{ backgroundColor: primaryColor }}
          >
            <h1 className="text-3xl font-bold text-white text-center">
              {content.headline || "Ready to Get Started?"}
            </h1>
            {content.subtext && (
              <p className="text-lg mt-4 text-white opacity-90 text-center">
                {content.subtext}
              </p>
            )}
            {content.ctaText && (
              <div className="mt-6 px-6 py-2 bg-white rounded-md">
                <span className="font-semibold" style={{ color: primaryColor }}>
                  {content.ctaText}
                </span>
              </div>
            )}
            {content.website && (
              <p className="mt-4 text-white opacity-80">
                {content.website}
              </p>
            )}
          </div>
        )}

        {!["title-centered", "title-left", "title-bold", "content-basic", "content-bullets", 
           "content-numbered", "two-column", "quote-centered", "quote-large", "stats-three", 
           "closing-thankyou", "closing-cta"].includes(templateId) && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
              {content.heading || content.title || currentSlideTemplate?.name || "Slide"}
            </h2>
            <p className="text-sm mt-2 opacity-60" style={{ color: textColor }}>
              Preview for this slide type
            </p>
          </div>
        )}
      </div>
    );
  };

  if (showTemplateSelector) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create Presentation</h1>
          <p className="text-muted-foreground">Choose a template to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templatesData?.templates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover-elevate"
              onClick={() => handleSelectTemplate(template)}
              data-testid={`template-${template.id}`}
            >
              <CardContent className="p-4">
                <div 
                  className="aspect-[16/9] rounded-md mb-3 flex items-center justify-center"
                  style={{ backgroundColor: `#${template.theme.primaryColor}20` }}
                >
                  <Presentation 
                    className="w-12 h-12" 
                    style={{ color: `#${template.theme.primaryColor}` }} 
                  />
                </div>
                <h3 className="font-semibold">{template.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                <div className="flex gap-1 mt-2">
                  {[template.theme.primaryColor, template.theme.secondaryColor, template.theme.backgroundColor].map((color, idx) => (
                    <div 
                      key={idx}
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: `#${color}` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowTemplateSelector(true)}
            data-testid="button-change-template"
          >
            Change Template
          </Button>
          <Input 
            placeholder="Presentation Title"
            value={presentationTitle}
            onChange={(e) => setPresentationTitle(e.target.value)}
            className="w-64"
            data-testid="input-presentation-title"
          />
        </div>
        <Button 
          onClick={() => generateMutation.mutate()} 
          disabled={generateMutation.isPending}
          data-testid="button-download-ppt"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download PPT
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="font-medium text-sm">Slides ({slides.length})</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-add-slide">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Slide</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="title">
                  <TabsList className="flex-wrap gap-1 h-auto p-1">
                    <TabsTrigger value="title">Title</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="bullets">Bullets</TabsTrigger>
                    <TabsTrigger value="twoColumn">Two Column</TabsTrigger>
                    <TabsTrigger value="image">Image</TabsTrigger>
                    <TabsTrigger value="quote">Quote</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="closing">Closing</TabsTrigger>
                  </TabsList>
                  {["title", "content", "bullets", "twoColumn", "image", "quote", "team", "chart", "closing"].map(cat => (
                    <TabsContent key={cat} value={cat} className="mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {slideTemplatesData?.slideTemplates
                          .filter(t => t.category === cat)
                          .map(template => (
                            <Card 
                              key={template.id}
                              className="cursor-pointer hover-elevate"
                              onClick={() => handleAddSlide(template.id)}
                              data-testid={`add-slide-${template.id}`}
                            >
                              <CardContent className="p-3">
                                <div 
                                  className="aspect-[16/9] rounded-md mb-2 flex items-center justify-center"
                                  style={{ backgroundColor: `#${selectedTemplate?.theme.primaryColor || "1a56db"}20` }}
                                >
                                  {categoryIcons[cat] && (
                                    <span style={{ color: `#${selectedTemplate?.theme.primaryColor || "1a56db"}` }}>
                                      {(() => {
                                        const Icon = categoryIcons[cat];
                                        return <Icon className="w-8 h-8" />;
                                      })()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium truncate">{template.name}</p>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {slides.map((slide, index) => {
                const template = slideTemplatesData?.slideTemplates.find(t => t.id === slide.templateId);
                return (
                  <div
                    key={slide.id}
                    className={`group relative rounded-md border-2 cursor-pointer transition-colors ${
                      index === selectedSlideIndex 
                        ? "border-primary bg-primary/5" 
                        : "border-transparent hover:border-muted"
                    }`}
                    onClick={() => setSelectedSlideIndex(index)}
                    data-testid={`slide-thumbnail-${index}`}
                  >
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {template?.name}
                        </span>
                      </div>
                      <div className="aspect-[16/9] rounded-sm overflow-hidden bg-card border">
                        {getSlidePreviewContent(slide)}
                      </div>
                    </div>
                    
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); handleMoveSlide(index, "up"); }}
                        disabled={index === 0}
                        data-testid={`button-move-up-${index}`}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); handleMoveSlide(index, "down"); }}
                        disabled={index === slides.length - 1}
                        data-testid={`button-move-down-${index}`}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); handleRemoveSlide(index); }}
                        data-testid={`button-remove-slide-${index}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex">
          <div className="w-1/2 border-r overflow-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Edit Slide {selectedSlideIndex + 1}</h2>
                <Dialog open={showSlideReplacer} onOpenChange={setShowSlideReplacer}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" data-testid="button-replace-slide">
                      <Replace className="w-4 h-4 mr-2" />
                      Replace Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Replace Slide Template</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue={currentSlideTemplate?.category || "title"}>
                      <TabsList className="flex-wrap gap-1 h-auto p-1">
                        <TabsTrigger value="title">Title</TabsTrigger>
                        <TabsTrigger value="content">Content</TabsTrigger>
                        <TabsTrigger value="bullets">Bullets</TabsTrigger>
                        <TabsTrigger value="twoColumn">Two Column</TabsTrigger>
                        <TabsTrigger value="image">Image</TabsTrigger>
                        <TabsTrigger value="quote">Quote</TabsTrigger>
                        <TabsTrigger value="team">Team</TabsTrigger>
                        <TabsTrigger value="chart">Chart</TabsTrigger>
                        <TabsTrigger value="closing">Closing</TabsTrigger>
                      </TabsList>
                      {["title", "content", "bullets", "twoColumn", "image", "quote", "team", "chart", "closing"].map(cat => (
                        <TabsContent key={cat} value={cat} className="mt-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {slideTemplatesData?.slideTemplates
                              .filter(t => t.category === cat)
                              .map(template => (
                                <Card 
                                  key={template.id}
                                  className={`cursor-pointer hover-elevate ${
                                    template.id === currentSlide?.templateId ? "ring-2 ring-primary" : ""
                                  }`}
                                  onClick={() => handleReplaceSlide(template.id)}
                                  data-testid={`replace-slide-${template.id}`}
                                >
                                  <CardContent className="p-3">
                                    <div 
                                      className="aspect-[16/9] rounded-md mb-2 flex items-center justify-center"
                                      style={{ backgroundColor: `#${selectedTemplate?.theme.primaryColor || "1a56db"}20` }}
                                    >
                                      {categoryIcons[cat] && (
                                        <span style={{ color: `#${selectedTemplate?.theme.primaryColor || "1a56db"}` }}>
                                          {(() => {
                                            const Icon = categoryIcons[cat];
                                            return <Icon className="w-8 h-8" />;
                                          })()}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium truncate">{template.name}</p>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>

              {currentSlideTemplate && (
                <div className="space-y-4">
                  {currentSlideTemplate.fields.map((field) => (
                    <div key={field.id}>
                      <Label htmlFor={field.id} className="flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      {field.type === "body" ? (
                        <Textarea
                          id={field.id}
                          placeholder={field.placeholder}
                          value={currentSlide?.content[field.id] || ""}
                          onChange={(e) => handleSlideContentChange(field.id, e.target.value)}
                          maxLength={field.maxLength}
                          className="mt-1"
                          data-testid={`input-${field.id}`}
                        />
                      ) : (
                        <Input
                          id={field.id}
                          placeholder={field.placeholder}
                          value={currentSlide?.content[field.id] || ""}
                          onChange={(e) => handleSlideContentChange(field.id, e.target.value)}
                          maxLength={field.maxLength}
                          className="mt-1"
                          data-testid={`input-${field.id}`}
                        />
                      )}
                    </div>
                  ))}

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Speaker Notes (Footnote)</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateFootnote(selectedSlideIndex)}
                        disabled={generatingFootnotes.has(currentSlide?.id || "")}
                        data-testid="button-generate-footnote"
                      >
                        {generatingFootnotes.has(currentSlide?.id || "") ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Generate with AI
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Add speaker notes for this slide..."
                      value={currentSlide?.footnote || ""}
                      onChange={(e) => {
                        setSlides(prev => prev.map((s, idx) => 
                          idx === selectedSlideIndex ? { ...s, footnote: e.target.value } : s
                        ));
                      }}
                      className="min-h-[80px]"
                      data-testid="input-footnote"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-1/2 bg-muted/30 p-6 overflow-auto">
            <div className="mb-4">
              <h2 className="font-semibold">Preview</h2>
              <p className="text-sm text-muted-foreground">
                Slide {selectedSlideIndex + 1} of {slides.length}
              </p>
            </div>
            {renderSlidePreview()}
            
            {currentSlide?.footnote && (
              <div className="mt-4 p-3 bg-card rounded-md border">
                <p className="text-xs text-muted-foreground mb-1">Speaker Notes:</p>
                <p className="text-sm">{currentSlide.footnote}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
