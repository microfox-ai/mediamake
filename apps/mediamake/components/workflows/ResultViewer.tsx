'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ResultViewerProps {
  result: any;
  compact?: boolean;
  maxHeight?: string;
}

export function ResultViewer({ result, compact = false, maxHeight = '400px' }: ResultViewerProps) {
  const [copied, setCopied] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  if (result === undefined || result === null) {
    return (
      <div className="text-xs text-muted-foreground italic p-3 text-center">
        No result yet
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  const renderValue = (value: any, path: string = '', depth: number = 0): React.ReactElement => {
    // Handle null/undefined
    if (value === null) {
      return <span className="text-orange-500">null</span>;
    }
    if (value === undefined) {
      return <span className="text-orange-500">undefined</span>;
    }

    // Handle primitives
    if (typeof value === 'string') {
      // Check if it's an image URL
      if (value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || value.startsWith('data:image')) {
        return (
          <div className="space-y-2">
            <div className="text-blue-600 dark:text-blue-400 break-all">"{value}"</div>
            <div className="mt-2 border rounded-md overflow-hidden bg-gray-50 dark:bg-gray-900">
              <img 
                src={value} 
                alt="Result" 
                className="max-w-full h-auto max-h-48 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        );
      }
      return <span className="text-green-600 dark:text-green-400">"{value}"</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-purple-600 dark:text-purple-400">{value}</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-blue-600 dark:text-blue-400">{value.toString()}</span>;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground">[]</span>;
      }

      const isExpanded = expandedKeys.has(path);
      const preview = compact && !isExpanded 
        ? `Array(${value.length})`
        : null;

      if (preview && depth > 0) {
        return (
          <div className="inline-flex items-center gap-1">
            <button
              onClick={() => toggleExpand(path)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
            <span className="text-muted-foreground">{preview}</span>
          </div>
        );
      }

      return (
        <div>
          <div className="flex items-center gap-1">
            {compact && depth > 0 && (
              <button
                onClick={() => toggleExpand(path)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            <span className="text-muted-foreground">[</span>
          </div>
          {(isExpanded || !compact || depth === 0) && (
            <div className="ml-4 border-l border-gray-300 dark:border-gray-700 pl-2 space-y-1">
              {value.slice(0, compact && depth > 0 ? 3 : value.length).map((item, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-muted-foreground">{index}:</span>
                  {renderValue(item, `${path}[${index}]`, depth + 1)}
                </div>
              ))}
              {compact && depth > 0 && value.length > 3 && (
                <div className="text-muted-foreground text-xs">
                  ... {value.length - 3} more items
                </div>
              )}
            </div>
          )}
          <span className="text-muted-foreground">]</span>
        </div>
      );
    }

    // Handle objects
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return <span className="text-muted-foreground">{'{}'}</span>;
      }

      const isExpanded = expandedKeys.has(path);
      const preview = compact && !isExpanded && depth > 0
        ? `Object(${keys.length})`
        : null;

      if (preview && depth > 0) {
        return (
          <div className="inline-flex items-center gap-1">
            <button
              onClick={() => toggleExpand(path)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
            <span className="text-muted-foreground">{preview}</span>
          </div>
        );
      }

      return (
        <div>
          <div className="flex items-center gap-1">
            {compact && depth > 0 && (
              <button
                onClick={() => toggleExpand(path)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            <span className="text-muted-foreground">{'{'}</span>
          </div>
          {(isExpanded || !compact || depth === 0) && (
            <div className="ml-4 border-l border-gray-300 dark:border-gray-700 pl-2 space-y-1">
              {keys.slice(0, compact && depth > 0 ? 5 : keys.length).map((key) => (
                <div key={key} className="flex gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-medium">{key}:</span>
                  {renderValue(value[key], `${path}.${key}`, depth + 1)}
                </div>
              ))}
              {compact && depth > 0 && keys.length > 5 && (
                <div className="text-muted-foreground text-xs">
                  ... {keys.length - 5} more properties
                </div>
              )}
            </div>
          )}
          <span className="text-muted-foreground">{'}'}</span>
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      
      <ScrollArea style={{ maxHeight }} className="rounded-md border bg-gray-50 dark:bg-gray-950 p-4 pt-10">
        <div className="font-mono text-xs">
          {renderValue(result, 'root', 0)}
        </div>
      </ScrollArea>
    </div>
  );
}

