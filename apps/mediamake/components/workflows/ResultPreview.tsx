'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, FileText, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResultPreviewProps {
  result: any;
  compact?: boolean;
}

export function ResultPreview({ result, compact = true }: ResultPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [viewStack, setViewStack] = useState<Array<{ value: any; path: string }>>([]);

  if (result === undefined || result === null) {
    return null;
  }

  // Current value to display (either result or drilled-down value)
  const currentValue = viewStack.length > 0 ? viewStack[viewStack.length - 1].value : result;

  // Helper to check if value is an image URL
  const isImageUrl = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) !== null || value.startsWith('data:image');
  };

  // Helper to extract images from nested objects
  const findImages = (obj: any, maxDepth: number = 3): string[] => {
    const images: string[] = [];
    
    const traverse = (val: any, depth: number) => {
      if (depth > maxDepth) return;
      
      if (typeof val === 'string' && isImageUrl(val)) {
        images.push(val);
      } else if (Array.isArray(val)) {
        val.forEach(item => traverse(item, depth + 1));
      } else if (typeof val === 'object' && val !== null) {
        Object.values(val).forEach(v => traverse(v, depth + 1));
      }
    };
    
    traverse(obj, 0);
    return images;
  };

  // Extract images from current value
  const images = findImages(currentValue);

  // Check if current value is an array
  const isArray = Array.isArray(currentValue);
  const arrayItems = isArray ? currentValue : [];
  
  // Check if it's a primitive (string, number, boolean)
  const isPrimitive = ['string', 'number', 'boolean'].includes(typeof currentValue);

  // Handle field selection (drill down)
  const handleFieldClick = (key: string, value: any) => {
    setViewStack([...viewStack, { value, path: key }]);
    setCurrentIndex(0); // Reset carousel position
    setSelectedField(key);
  };

  // Handle back navigation
  const handleBack = () => {
    const newStack = [...viewStack];
    newStack.pop();
    setViewStack(newStack);
    setCurrentIndex(0);
    if (newStack.length === 0) {
      setSelectedField(null);
    }
  };

  // Render image carousel
  const renderImageCarousel = () => {
    if (images.length === 0) return null;

    const currentImage = images[currentIndex];

    return (
      <div className="space-y-2">
        <div className="relative rounded-md overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <img
            src={currentImage}
            alt={`Result ${currentIndex + 1}`}
            className="w-full h-32 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E';
            }}
          />
          {images.length > 1 && (
            <>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all',
                      idx === currentIndex
                        ? 'bg-white w-3'
                        : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-1 top-1/2 transform -translate-y-1/2 h-6 w-6 bg-black/50 hover:bg-black/70 text-white nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((currentIndex - 1 + images.length) % images.length);
                }}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 bg-black/50 hover:bg-black/70 text-white nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((currentIndex + 1) % images.length);
                }}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            <span>{images.length} image{images.length > 1 ? 's' : ''}</span>
          </div>
          {images.length > 1 && (
            <span>{currentIndex + 1} / {images.length}</span>
          )}
        </div>
      </div>
    );
  };

  // Render array carousel (for all arrays)
  const renderArrayCarousel = () => {
    if (!isArray || arrayItems.length === 0) return null;

    const currentItem = arrayItems[currentIndex];
    const hasMultipleItems = arrayItems.length > 1;
    const isItemObject = typeof currentItem === 'object' && currentItem !== null;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <List className="h-3 w-3" />
            <span>{arrayItems.length} item{arrayItems.length > 1 ? 's' : ''}</span>
          </div>
          {hasMultipleItems && (
            <span>{currentIndex + 1} / {arrayItems.length}</span>
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isItemObject) {
                handleFieldClick(`Item ${currentIndex + 1}`, currentItem);
              }
            }}
            className={cn(
              "w-full bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-800 min-h-[80px] max-h-48 overflow-y-auto flex items-start nodrag",
              isItemObject && "hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
            )}
          >
            <div className="w-full">
              {isItemObject ? (
                <div className="text-xs space-y-1">
                  {Object.entries(currentItem).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="text-left break-words">
                      <span className="text-cyan-600 dark:text-cyan-400 font-medium">{key}</span>
                      <span className="text-muted-foreground">: </span>
                      <span className="text-foreground">
                        {typeof value === 'object' 
                          ? Array.isArray(value) ? `[${value.length}]` : '{...}'
                          : String(value).slice(0, 50) + (String(value).length > 50 ? '...' : '')
                        }
                      </span>
                    </div>
                  ))}
                  {Object.keys(currentItem).length > 6 && (
                    <div className="text-muted-foreground text-left text-[10px]">
                      +{Object.keys(currentItem).length - 6} more fields
                    </div>
                  )}
                  {isItemObject && (
                    <div className="text-blue-600 dark:text-blue-400 text-[10px] mt-2 text-left font-medium">
                      Click to expand →
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-foreground leading-relaxed break-words">
                  {String(currentItem)}
                </div>
              )}
            </div>
          </button>
          
          {hasMultipleItems && (
            <>
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                {arrayItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all nodrag',
                      idx === currentIndex
                        ? 'bg-blue-500 w-3'
                        : 'bg-gray-400 hover:bg-gray-500'
                    )}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-6 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((currentIndex - 1 + arrayItems.length) % arrayItems.length);
                }}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 transform -translate-y-1/2 h-6 w-6 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((currentIndex + 1) % arrayItems.length);
                }}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };
  
  // Render primitive (string, number, boolean) preview
  const renderPrimitivePreview = () => {
    if (!isPrimitive) return null;
    
    const displayValue = typeof currentValue === 'string' 
      ? currentValue 
      : String(currentValue);
    
    return (
      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-800 max-h-48 overflow-y-auto">
        <div className="text-xs text-foreground leading-relaxed break-words whitespace-pre-wrap">
          {displayValue}
        </div>
      </div>
    );
  };

  // Render object summary (clickable fields)
  const renderObjectSummary = () => {
    if (typeof currentValue !== 'object' || currentValue === null || isArray) return null;

    const keys = Object.keys(currentValue);
    
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>{keys.length} field{keys.length > 1 ? 's' : ''}</span>
        </div>
        <div className="text-[10px] bg-gray-50 dark:bg-gray-900 p-1.5 rounded border border-gray-200 dark:border-gray-800">
          <div className="space-y-0.5">
            {keys.slice(0, compact ? 5 : 10).map(key => {
              const value = currentValue[key];
              const isClickable = typeof value === 'object' || typeof value === 'string';
              
              return (
                <button
                  key={key}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFieldClick(key, value);
                  }}
                  className={cn(
                    "w-full text-left px-1.5 py-1 rounded truncate nodrag",
                    isClickable && "hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
                  )}
                >
                  <span className="text-cyan-600 dark:text-cyan-400 font-medium">{key}</span>
                  <span className="text-muted-foreground">: </span>
                  <span className="text-muted-foreground">
                    {typeof value === 'object' 
                      ? Array.isArray(value) 
                        ? `[${value.length}]`
                        : '{...}'
                      : String(value).slice(0, 20) + (String(value).length > 20 ? '...' : '')
                    }
                  </span>
                </button>
              );
            })}
            {keys.length > (compact ? 5 : 10) && (
              <div className="text-muted-foreground px-1.5">
                +{keys.length - (compact ? 5 : 10)} more
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Debug: Check what type of value we have
  const valueType = currentValue === null ? 'null' 
    : Array.isArray(currentValue) ? 'array'
    : typeof currentValue;

  return (
    <div className="space-y-2 p-2 bg-white/50 dark:bg-black/20 rounded-md border border-gray-200 dark:border-gray-800">
      {/* Breadcrumb navigation */}
      {viewStack.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] pb-1 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleBack();
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline nodrag flex items-center gap-0.5"
          >
            <ChevronLeft className="h-3 w-3" />
            Back
          </button>
          <span className="text-muted-foreground">•</span>
          <span className="text-foreground font-medium truncate">
            {viewStack[viewStack.length - 1].path}
          </span>
        </div>
      )}

      {/* Show appropriate view based on value type */}
      {(() => {
        // Prioritize image display if images found
        if (images.length > 0) return renderImageCarousel();
        
        // Show array carousel for any array
        if (isArray && arrayItems.length > 0) return renderArrayCarousel();
        
        // Show primitive preview for strings, numbers, booleans
        if (isPrimitive) return renderPrimitivePreview();
        
        // Show object summary for plain objects
        if (valueType === 'object' && currentValue !== null) return renderObjectSummary();
        
        // Fallback for null/undefined
        return (
          <div className="text-[10px] text-muted-foreground italic text-center py-2">
            {currentValue === null ? 'null' : 'undefined'}
          </div>
        );
      })()}
    </div>
  );
}

