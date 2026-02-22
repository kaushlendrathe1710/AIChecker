import { useRef, useEffect, useCallback, useState } from "react";
import { Stage, Layer, Rect, Circle, Text, Line, Star, RegularPolygon, Arrow, Transformer, Group, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import { useEditorStore, type EditorElement } from "../store/editorStore";
import { interpolateKeyframes } from "../data/animations";

export default function CanvasStage() {
  const {
    elements, selectedIds, canvasSettings, zoom, toolMode,
    isAnimationPlaying, animationTime,
    setSelectedIds, updateElement, addElement, pushHistory,
    showGrid, snapToGrid, gridSize,
  } = useEditorStore();

  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr || !layerRef.current) return;
    const nodes = selectedIds
      .map((id) => layerRef.current?.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, elements]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage() || e.target.attrs.id === "canvas-bg") {
      setSelectedIds([]);
      return;
    }
    const clickedId = e.target.attrs.id || e.target.parent?.attrs.id;
    if (!clickedId || clickedId === "canvas-bg") {
      setSelectedIds([]);
      return;
    }
    const el = elements.find((el) => el.id === clickedId);
    if (el?.locked) return;

    if (e.evt.shiftKey) {
      setSelectedIds(
        selectedIds.includes(clickedId)
          ? selectedIds.filter((id) => id !== clickedId)
          : [...selectedIds, clickedId]
      );
    } else {
      setSelectedIds([clickedId]);
    }
  }, [elements, selectedIds, setSelectedIds]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, el: EditorElement) => {
    let x = e.target.x();
    let y = e.target.y();
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    updateElement(el.id, { x, y });
    pushHistory();
  }, [updateElement, pushHistory, snapToGrid, gridSize]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>, el: EditorElement) => {
    const node = e.target;
    updateElement(el.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    });
    pushHistory();
  }, [updateElement, pushHistory]);

  const getAnimatedProps = (el: EditorElement) => {
    if (!isAnimationPlaying || !el.keyframes?.length) {
      return { x: el.x, y: el.y, scaleX: el.scaleX, scaleY: el.scaleY, rotation: el.rotation, opacity: el.opacity };
    }
    return interpolateKeyframes(el.keyframes, animationTime, {
      x: el.x, y: el.y, scaleX: el.scaleX, scaleY: el.scaleY, rotation: el.rotation, opacity: el.opacity,
    });
  };

  const handleDoubleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>, el: EditorElement) => {
    if (el.type !== "text" || el.locked) return;
    const stage = stageRef.current;
    if (!stage) return;
    const textNode = e.target as Konva.Text;
    textNode.hide();
    const textPosition = textNode.getAbsolutePosition();
    const container = stage.container();
    const textarea = document.createElement("textarea");
    container.appendChild(textarea);

    const areaPosition = { x: textPosition.x, y: textPosition.y };
    textarea.value = el.text || "";
    textarea.style.position = "absolute";
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${textNode.width() * textNode.scaleX() * zoom}px`;
    textarea.style.height = `${textNode.height() * textNode.scaleY() * zoom}px`;
    textarea.style.fontSize = `${(el.textStyle?.fontSize || 20) * zoom}px`;
    textarea.style.fontFamily = el.textStyle?.fontFamily || "Inter";
    textarea.style.color = el.textStyle?.fill || "#000";
    textarea.style.border = "2px solid #3b82f6";
    textarea.style.padding = "4px";
    textarea.style.margin = "0";
    textarea.style.overflow = "auto";
    textarea.style.background = "rgba(255,255,255,0.95)";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.lineHeight = String(el.textStyle?.lineHeight || 1.2);
    textarea.style.zIndex = "1000";
    textarea.focus();

    const removeTextarea = () => {
      updateElement(el.id, { text: textarea.value });
      pushHistory();
      textarea.remove();
      textNode.show();
    };

    textarea.addEventListener("blur", removeTextarea);
    textarea.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        textarea.blur();
      }
    });
  }, [zoom, updateElement, pushHistory]);

  const handleStageDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (toolMode !== "text") return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;
    addElement({
      id: "",
      type: "text",
      name: "Text",
      x: pos.x,
      y: pos.y,
      width: 300,
      height: 60,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      text: "Double click to edit",
      textStyle: {
        fontFamily: "Inter",
        fontSize: 24,
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        align: "left",
        lineHeight: 1.2,
        letterSpacing: 0,
        fill: "#000000",
      },
    });
  }, [toolMode, addElement]);

  const renderElement = (el: EditorElement) => {
    if (!el.visible) return null;
    const animProps = getAnimatedProps(el);
    const commonProps = {
      id: el.id,
      x: animProps.x,
      y: animProps.y,
      rotation: animProps.rotation || 0,
      scaleX: animProps.scaleX || 1,
      scaleY: animProps.scaleY || 1,
      opacity: animProps.opacity ?? 1,
      draggable: !el.locked && !isAnimationPlaying && toolMode === "select",
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, el),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, el),
      onDblClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleDoubleClick(e, el),
    };

    const shadowProps = el.shadowColor ? {
      shadowColor: el.shadowColor,
      shadowBlur: el.shadowBlur || 0,
      shadowOffsetX: el.shadowOffsetX || 0,
      shadowOffsetY: el.shadowOffsetY || 0,
    } : {};

    if (el.type === "text") {
      const ts = el.textStyle;
      return (
        <Text
          key={el.id}
          {...commonProps}
          {...shadowProps}
          text={el.text || ""}
          width={el.width}
          height={el.height}
          fontFamily={ts?.fontFamily || "Inter"}
          fontSize={ts?.fontSize || 20}
          fontStyle={`${ts?.fontStyle || ""} ${ts?.fontWeight || ""}`.trim()}
          textDecoration={ts?.textDecoration || ""}
          align={ts?.align || "left"}
          lineHeight={ts?.lineHeight || 1.2}
          letterSpacing={ts?.letterSpacing || 0}
          fill={ts?.fill || "#000000"}
          stroke={ts?.stroke}
          strokeWidth={ts?.strokeWidth}
          wrap="word"
        />
      );
    }

    if (el.type === "shape") {
      const fill = el.fill || "#cccccc";
      const fillProps: any = { fill };
      if (el.gradientFill) {
        if (el.gradientFill.type === "linear") {
          fillProps.fillLinearGradientStartPoint = { x: 0, y: 0 };
          fillProps.fillLinearGradientEndPoint = { x: el.width, y: el.height };
          fillProps.fillLinearGradientColorStops = el.gradientFill.stops.flatMap((s) => [s.offset, s.color]);
          delete fillProps.fill;
        } else {
          fillProps.fillRadialGradientStartPoint = { x: el.width / 2, y: el.height / 2 };
          fillProps.fillRadialGradientEndPoint = { x: el.width / 2, y: el.height / 2 };
          fillProps.fillRadialGradientStartRadius = 0;
          fillProps.fillRadialGradientEndRadius = Math.max(el.width, el.height) / 2;
          fillProps.fillRadialGradientColorStops = el.gradientFill.stops.flatMap((s) => [s.offset, s.color]);
          delete fillProps.fill;
        }
      }

      switch (el.shapeType) {
        case "circle":
          return (
            <Circle
              key={el.id}
              {...commonProps}
              {...shadowProps}
              {...fillProps}
              x={(animProps.x || 0) + el.width / 2}
              y={(animProps.y || 0) + el.height / 2}
              radius={Math.min(el.width, el.height) / 2}
              stroke={el.stroke}
              strokeWidth={el.strokeWidth}
            />
          );
        case "triangle":
          return (
            <RegularPolygon
              key={el.id}
              {...commonProps}
              {...shadowProps}
              {...fillProps}
              x={(animProps.x || 0) + el.width / 2}
              y={(animProps.y || 0) + el.height / 2}
              sides={3}
              radius={Math.min(el.width, el.height) / 2}
              stroke={el.stroke}
              strokeWidth={el.strokeWidth}
            />
          );
        case "star":
          return (
            <Star
              key={el.id}
              {...commonProps}
              {...shadowProps}
              {...fillProps}
              x={(animProps.x || 0) + el.width / 2}
              y={(animProps.y || 0) + el.height / 2}
              numPoints={5}
              innerRadius={Math.min(el.width, el.height) / 4}
              outerRadius={Math.min(el.width, el.height) / 2}
              stroke={el.stroke}
              strokeWidth={el.strokeWidth}
            />
          );
        case "hexagon":
          return (
            <RegularPolygon
              key={el.id}
              {...commonProps}
              {...shadowProps}
              {...fillProps}
              x={(animProps.x || 0) + el.width / 2}
              y={(animProps.y || 0) + el.height / 2}
              sides={6}
              radius={Math.min(el.width, el.height) / 2}
              stroke={el.stroke}
              strokeWidth={el.strokeWidth}
            />
          );
        case "line":
          return (
            <Line
              key={el.id}
              {...commonProps}
              {...shadowProps}
              points={[0, 0, el.width, 0]}
              stroke={el.stroke || el.fill || "#000"}
              strokeWidth={el.strokeWidth || 3}
            />
          );
        case "arrow":
          return (
            <Arrow
              key={el.id}
              {...commonProps}
              {...shadowProps}
              points={[0, 0, el.width, 0]}
              stroke={el.stroke || el.fill || "#000"}
              strokeWidth={el.strokeWidth || 3}
              fill={el.stroke || el.fill || "#000"}
              pointerLength={15}
              pointerWidth={12}
            />
          );
        default:
          return (
            <Rect
              key={el.id}
              {...commonProps}
              {...shadowProps}
              {...fillProps}
              width={el.width}
              height={el.height}
              cornerRadius={el.cornerRadius || 0}
              stroke={el.stroke}
              strokeWidth={el.strokeWidth}
            />
          );
      }
    }

    if (el.type === "image" && el.imageSrc) {
      return <CanvasImage key={el.id} element={el} commonProps={commonProps} shadowProps={shadowProps} />;
    }

    return null;
  };

  const stageWidth = containerRef.current?.offsetWidth || 900;
  const stageHeight = containerRef.current?.offsetHeight || 600;

  return (
    <div ref={containerRef} className="flex-1 bg-neutral-800 overflow-hidden relative" style={{ cursor: toolMode === "text" ? "text" : "default" }}>
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        scaleX={zoom}
        scaleY={zoom}
        x={(stageWidth - canvasSettings.width * zoom) / 2}
        y={Math.max(20, (stageHeight - canvasSettings.height * zoom) / 2)}
        onClick={handleStageClick}
        onDblClick={handleStageDblClick}
      >
        <Layer ref={layerRef}>
          <Rect
            id="canvas-bg"
            x={0}
            y={0}
            width={canvasSettings.width}
            height={canvasSettings.height}
            fill={canvasSettings.backgroundColor}
            shadowColor="rgba(0,0,0,0.3)"
            shadowBlur={20}
            shadowOffsetX={5}
            shadowOffsetY={5}
            listening={true}
          />
          {showGrid && Array.from({ length: Math.ceil(canvasSettings.width / gridSize) + 1 }).map((_, i) => (
            <Line key={`gv${i}`} points={[i * gridSize, 0, i * gridSize, canvasSettings.height]} stroke="#ddd" strokeWidth={0.5} listening={false} />
          ))}
          {showGrid && Array.from({ length: Math.ceil(canvasSettings.height / gridSize) + 1 }).map((_, i) => (
            <Line key={`gh${i}`} points={[0, i * gridSize, canvasSettings.width, i * gridSize]} stroke="#ddd" strokeWidth={0.5} listening={false} />
          ))}
          {elements.map(renderElement)}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) return oldBox;
              return newBox;
            }}
            enabledAnchors={["top-left", "top-center", "top-right", "middle-right", "bottom-right", "bottom-center", "bottom-left", "middle-left"]}
            rotateEnabled={true}
            borderStroke="#3b82f6"
            anchorFill="#ffffff"
            anchorStroke="#3b82f6"
            anchorSize={8}
            anchorCornerRadius={2}
          />
        </Layer>
      </Stage>
    </div>
  );
}

function CanvasImage({ element, commonProps, shadowProps }: {
  element: EditorElement;
  commonProps: any;
  shadowProps: any;
}) {
  const imageRef = useRef<Konva.Image>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!element.imageSrc) return;
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.src = element.imageSrc;
    image.onload = () => setImg(image);
  }, [element.imageSrc]);

  if (!img) return null;

  return (
    <KonvaImage
      ref={imageRef}
      {...commonProps}
      {...shadowProps}
      image={img}
      width={element.width}
      height={element.height}
    />
  );
}
